import { sha256 } from '@noble/hashes/sha256'
import { bech32 } from 'bech32'
import { secp256k1 } from '@noble/curves/secp256k1'
import Big from 'big.js'
import { Buffer } from 'buffer'
import { address as bitcoinjsAddress } from 'bitcoinjs-lib'
import type { DecodedBolt11Invoice } from './@types/invoices.js'
import { msatsToSats } from './conversion.js'

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

const DIVISORS: Record<string, Big> = {
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
  9: fallbackAddressParser
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

function tagsItems(tags: { tagName: string; data: unknown }[], tagName: string) {
  const tag = tags.filter((item) => item.tagName === tagName)
  const data = tag.length > 0 ? tag[0].data : null
  return data
}

function tagsContainItem(tags: { tagName: string; data: unknown }[], tagName: string) {
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

function decode(paymentRequest: string): DecodedBolt11Invoice {
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

  const msat = value ? (hrpToMillisat(value + prefixMatches[3], true) as string) : 'any'

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

  const expiry =
    (tagsContainItem(tags, TAGNAMES['6']) && (tagsItems(tags, TAGNAMES['6']) as number)) || 3600
  const expiresAt = timestamp + expiry

  const toSign = Buffer.concat([
    Buffer.from(prefix, 'utf8'),
    Buffer.from(convert(wordsNoSig, 5, 8))
  ])

  const payReqHash = hash(toSign)

  const pubKey = secp256k1.Signature.fromCompact(sigBuffer)
    .addRecoveryBit(recoveryFlag)
    .recoverPublicKey(payReqHash)
    .toHex()

  if (tagsContainItem(tags, TAGNAMES['19']) && tagsItems(tags, TAGNAMES['19']) !== pubKey) {
    throw new Error('Lightning Payment Request signature pubkey does not match payee pubkey')
  }

  return {
    nodeId: pubKey,
    amount: msatsToSats(msat === 'any' ? '0' : msat),
    createdAt: timestamp,
    expiresAt,
    description: (tags.find(({ tagName }) => tagName === 'description')?.data as string) || null,
    descriptionHash:
      (tags.find(({ tagName }) => tagName === 'purpose_commit_hash')?.data as string) || null,
    hash: tags.find(({ tagName }) => tagName === 'payment_hash')?.data as string
  }
}

export default decode
