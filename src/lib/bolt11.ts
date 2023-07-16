'use strict'

import { sha256 } from '@noble/hashes/sha256'
import { bech32 } from 'bech32'
import secp256k1 from '@noble/secp256k1'
import Big from 'big.js'
import { Buffer } from 'buffer'
import { address as bitcoinjsAddress } from 'bitcoinjs-lib'

type Network = {
  bech32: string
  pubKeyHash: number
  scriptHash: number
  validWitnessVersions: [number, number]
}

// defaults for encode; default timestamp is current time at call
const DEFAULTNETWORK = {
  // default network is bitcoin
  bech32: 'bc',
  pubKeyHash: 0x00,
  scriptHash: 0x05,
  validWitnessVersions: [0, 1]
}
const TESTNETWORK = {
  bech32: 'tb',
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  validWitnessVersions: [0, 1]
}
const REGTESTNETWORK = {
  bech32: 'bcrt',
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  validWitnessVersions: [0, 1]
}
const SIMNETWORK = {
  bech32: 'sb',
  pubKeyHash: 0x3f,
  scriptHash: 0x7b,
  validWitnessVersions: [0, 1]
}

const FEATUREBIT_ORDER = [
  'option_data_loss_protect',
  'initial_routing_sync',
  'option_upfront_shutdown_script',
  'gossip_queries',
  'var_onion_optin',
  'gossip_queries_ex',
  'option_static_remotekey',
  'payment_secret',
  'basic_mpp',
  'option_support_large_channel'
]

const DIVISORS = {
  m: Big(1e3),
  u: Big(1e6),
  n: Big(1e9),
  p: Big(1e12)
}

const MAX_MILLISATS = Big('2100000000000000000')

const MILLISATS_PER_BTC = Big(1e11)

const TAGCODES: Record<string, number> = {
  payment_hash: 1,
  payment_secret: 16,
  description: 13,
  payee_node_key: 19,
  purpose_commit_hash: 23, // commit to longer descriptions (like a website)
  expire_time: 6, // default: 3600 (1 hour)
  min_final_cltv_expiry: 24, // default: 9
  fallback_address: 9,
  routing_info: 3, // for extra routing info (private etc.)
  feature_bits: 5
}

// reverse the keys and values of TAGCODES and insert into TAGNAMES
const TAGNAMES: Record<string, string> = {}
for (let i = 0, keys = Object.keys(TAGCODES); i < keys.length; i++) {
  const currentName = keys[i]
  const currentCode = TAGCODES[keys[i]].toString()
  TAGNAMES[currentCode] = currentName
}

const TAGPARSERS: Record<
  string,
  | ((words: number[]) => string | number | unknown)
  | ((
      words: number[],
      network: Network
    ) => { code: number; address: string | null; addressHash: string })
> = {
  1: (words: number[]) => wordsToBuffer(words, true).toString('hex'), // 256 bits
  16: (words: number[]) => wordsToBuffer(words, true).toString('hex'), // 256 bits
  13: (words: number[]) => wordsToBuffer(words, true).toString('utf8'), // string variable length
  19: (words: number[]) => wordsToBuffer(words, true).toString('hex'), // 264 bits
  23: (words: number[]) => wordsToBuffer(words, true).toString('hex'), // 256 bits
  6: wordsToIntBE, // default: 3600 (1 hour)
  24: wordsToIntBE, // default: 9
  9: fallbackAddressParser,
  3: routingInfoParser, // for extra routing info (private etc.)
  5: featureBitsParser // keep feature bits as array of 5 bit words
}

const unknownTagName = 'unknownTag'

function getUnknownParser(tagCode: string) {
  return (words: number[]) => ({
    tagCode: parseInt(tagCode),
    words: bech32.encode('unknown', words, Number.MAX_SAFE_INTEGER)
  })
}

function wordsToIntBE(words: number[]) {
  return words.reverse().reduce((total, item, index) => {
    return total + item * Math.pow(32, index)
  }, 0)
}

function hash(data: Buffer) {
  return sha256(data)
}

function convert(data: number[], inBits: number, outBits: number) {
  let value = 0
  let bits = 0
  const maxV = (1 << outBits) - 1

  const result = []
  for (let i = 0; i < data.length; ++i) {
    value = (value << inBits) | data[i]
    bits += inBits

    while (bits >= outBits) {
      bits -= outBits
      result.push((value >> bits) & maxV)
    }
  }

  if (bits > 0) {
    result.push((value << (outBits - bits)) & maxV)
  }

  return result
}

function wordsToBuffer(words: number[], trim: boolean) {
  let buffer = Buffer.from(convert(words, 5, 8))
  if (trim && (words.length * 5) % 8 !== 0) {
    buffer = buffer.subarray(0, -1)
  }
  return buffer
}

// see encoder for details
function fallbackAddressParser(words: number[], network: Network) {
  const version = words[0]
  words = words.slice(1)

  const addressHash = wordsToBuffer(words, true)

  let address = null

  switch (version) {
    case 17:
      address = bitcoinjsAddress.toBase58Check(addressHash, network.pubKeyHash)
      break
    case 18:
      address = bitcoinjsAddress.toBase58Check(addressHash, network.scriptHash)
      break
    case 0:
    case 1:
      address = bitcoinjsAddress.toBech32(addressHash, version, network.bech32)
      break
  }

  return {
    code: version,
    address,
    addressHash: addressHash.toString('hex')
  }
}

// first convert from words to buffer, trimming padding where necessary
// parse in 51 byte chunks. See encoder for details.
function routingInfoParser(words: number[]) {
  const routes = []
  let pubkey, shortChannelId, feeBaseMSats, feeProportionalMillionths, cltvExpiryDelta
  let routesBuffer = wordsToBuffer(words, true)
  while (routesBuffer.length > 0) {
    pubkey = routesBuffer.subarray(0, 33).toString('hex') // 33 bytes
    shortChannelId = routesBuffer.subarray(33, 41).toString('hex') // 8 bytes
    feeBaseMSats = parseInt(routesBuffer.subarray(41, 45).toString('hex'), 16) // 4 bytes
    feeProportionalMillionths = parseInt(routesBuffer.subarray(45, 49).toString('hex'), 16) // 4 bytes
    cltvExpiryDelta = parseInt(routesBuffer.subarray(49, 51).toString('hex'), 16) // 2 bytes

    routesBuffer = routesBuffer.subarray(51)

    routes.push({
      pubkey,
      short_channel_id: shortChannelId,
      fee_base_msat: feeBaseMSats,
      fee_proportional_millionths: feeProportionalMillionths,
      cltv_expiry_delta: cltvExpiryDelta
    })
  }
  return routes
}

function featureBitsParser(words: number[]) {
  const bools = words
    .slice()
    .reverse()
    .map((word) => [
      !!(word & 0b1),
      !!(word & 0b10),
      !!(word & 0b100),
      !!(word & 0b1000),
      !!(word & 0b10000)
    ])
    .reduce((finalArr, itemArr) => finalArr.concat(itemArr), [])
  while (bools.length < FEATUREBIT_ORDER.length * 2) {
    bools.push(false)
  }
  const featureBits = {
    word_length: words.length
  }
  FEATUREBIT_ORDER.forEach((featureName, index) => {
    featureBits[featureName] = {
      required: bools[index * 2],
      supported: bools[index * 2 + 1]
    }
  })
  if (bools.length > FEATUREBIT_ORDER.length * 2) {
    const extraBits = bools.slice(FEATUREBIT_ORDER.length * 2)
    featureBits.extra_bits = {
      start_bit: FEATUREBIT_ORDER.length * 2,
      bits: extraBits,
      has_required: extraBits.reduce(
        (result, bit, index) => (index % 2 !== 0 ? result || false : result || bit),
        false
      )
    }
  } else {
    featureBits.extra_bits = {
      start_bit: FEATUREBIT_ORDER.length * 2,
      bits: [],
      has_required: false
    }
  }
  return featureBits
}

function tagsItems(tags, tagName) {
  const tag = tags.filter((item) => item.tagName === tagName)
  const data = tag.length > 0 ? tag[0].data : null
  return data
}

function tagsContainItem(tags, tagName) {
  return tagsItems(tags, tagName) !== null
}

function hrpToMillisat(hrpString: string, outputString: boolean) {
  let divisor, value
  if (hrpString.slice(-1).match(/^[munp]$/)) {
    divisor = hrpString.slice(-1)
    value = hrpString.slice(0, -1)
  } else if (hrpString.slice(-1).match(/^[^munp0-9]$/)) {
    throw new Error('Not a valid multiplier for the amount')
  } else {
    value = hrpString
  }

  if (!value.match(/^\d+$/)) throw new Error('Not a valid human readable amount')

  const valueBN = Big(value)

  const millisatoshisBN = divisor
    ? valueBN.mul(MILLISATS_PER_BTC).div(DIVISORS[divisor])
    : valueBN.mul(MILLISATS_PER_BTC)

  if ((divisor === 'p' && !valueBN.mod(Big(10)).eq(Big(0))) || millisatoshisBN.gt(MAX_MILLISATS)) {
    throw new Error('Amount is outside of valid range')
  }

  return outputString ? millisatoshisBN.toString() : millisatoshisBN
}

function decode(paymentRequest: string) {
  if (typeof paymentRequest !== 'string')
    throw new Error('Lightning Payment Request must be string')

  if (paymentRequest.slice(0, 2).toLowerCase() !== 'ln')
    throw new Error('Not a proper lightning payment request')

  const decoded = bech32.decode(paymentRequest, Number.MAX_SAFE_INTEGER)

  paymentRequest = paymentRequest.toLowerCase()

  const prefix = decoded.prefix
  let words = decoded.words

  // signature is always 104 words on the end
  // cutting off at the beginning helps since there's no way to tell
  // ahead of time how many tags there are.
  const sigWords = words.slice(-104)

  // grabbing a copy of the words for later, words will be sliced as we parse.
  const wordsNoSig = words.slice(0, -104)
  words = words.slice(0, -104)

  let sigBuffer = wordsToBuffer(sigWords, true)
  const recoveryFlag = sigBuffer.subarray(-1)[0]
  sigBuffer = sigBuffer.subarray(0, -1)

  if (!(recoveryFlag in [0, 1, 2, 3]) || sigBuffer.length !== 64) {
    throw new Error('Signature is missing or incorrect')
  }

  // Without reverse lookups, can't say that the multipier at the end must
  // have a number before it, so instead we parse, and if the second group
  // doesn't have anything, there's a good chance the last letter of the
  // coin type got captured by the third group, so just re-regex without
  // the number.
  let prefixMatches = prefix.match(/^ln(\S+?)(\d*)([a-zA-Z]?)$/)

  if (prefixMatches && !prefixMatches[2]) prefixMatches = prefix.match(/^ln(\S+)$/)

  if (!prefixMatches) {
    throw new Error('Not a proper lightning payment request')
  }

  const bech32Prefix = prefixMatches[1]
  let coinNetwork

  switch (bech32Prefix) {
    case DEFAULTNETWORK.bech32:
      coinNetwork = DEFAULTNETWORK
      break
    case TESTNETWORK.bech32:
      coinNetwork = TESTNETWORK
      break
    case REGTESTNETWORK.bech32:
      coinNetwork = REGTESTNETWORK
      break
    case SIMNETWORK.bech32:
      coinNetwork = SIMNETWORK
      break
  }

  if (!coinNetwork || coinNetwork.bech32 !== bech32Prefix) {
    throw new Error('Unknown coin bech32 prefix')
  }

  const value = prefixMatches[2]

  let millisatoshis

  if (value) {
    const divisor = prefixMatches[3]
    millisatoshis = hrpToMillisat(value + divisor, true)
  } else {
    millisatoshis = null
  }

  // reminder: left padded 0 bits
  const timestamp = wordsToIntBE(words.slice(0, 7))
  words = words.slice(7) // trim off the left 7 words

  const tags = []
  let tagName, parser, tagLength, tagWords
  // we have no tag count to go on, so just keep hacking off words
  // until we have none.
  while (words.length > 0) {
    const tagCode = words[0].toString()
    tagName = TAGNAMES[tagCode] || unknownTagName
    parser = TAGPARSERS[tagCode] || getUnknownParser(tagCode)
    words = words.slice(1)

    tagLength = wordsToIntBE(words.slice(0, 2))
    words = words.slice(2)

    tagWords = words.slice(0, tagLength)
    words = words.slice(tagLength)

    // See: parsers for more comments
    tags.push({
      tagName,
      // eslint-disable-next-line
      // @ts-ignore
      data: parser(tagWords, coinNetwork) // only fallback address needs coinNetwork
    })
  }

  let timeExpireDate, timeExpireDateString
  // be kind and provide an absolute expiration date.
  // good for logs
  if (tagsContainItem(tags, TAGNAMES['6'])) {
    timeExpireDate = timestamp + tagsItems(tags, TAGNAMES['6'])
    timeExpireDateString = new Date(timeExpireDate * 1000).toISOString()
  }

  const toSign = Buffer.concat([
    Buffer.from(prefix, 'utf8'),
    Buffer.from(convert(wordsNoSig, 5, 8))
  ])
  const payReqHash = hash(toSign)
  const sig = secp256k1.Signature.fromCompact(sigBuffer.toString('hex'))
  const sigPubkey = Buffer.from(sig.recoverPublicKey(payReqHash).toRawBytes())
  // const sigPubkey = Buffer.from(secp256k1.ecdsaRecover(sigBuffer, recoveryFlag, payReqHash, true))
  if (
    tagsContainItem(tags, TAGNAMES['19']) &&
    tagsItems(tags, TAGNAMES['19']) !== sigPubkey.toString('hex')
  ) {
    throw new Error('Lightning Payment Request signature pubkey does not match payee pubkey')
  }

  let finalResult = {
    msat: millisatoshis,
    timestamp,
    payeeNodeKey: sigPubkey.toString('hex'),
    tags
  }

  if (timeExpireDate) {
    finalResult = Object.assign(finalResult, { timeExpireDate, timeExpireDateString })
  }

  return finalResult
}

function getTagsObject(tags) {
  const result = {}
  tags.forEach((tag) => {
    if (tag.tagName === unknownTagName) {
      if (!result.unknownTags) {
        result.unknownTags = []
      }
      result.unknownTags.push(tag.data)
    } else {
      result[tag.tagName] = tag.data
    }
  })

  return result
}

export default decode
