import secp256k1 from 'secp256k1'
import sha256 from 'crypto-js/sha256'
import hmacSHA256 from 'crypto-js/hmac-sha256'
import Hex from 'crypto-js/enc-hex'
import lightning from '$lib/lightning'
import { hexStringToByte, toHexString } from '$lib/utils'

const CANONICAL_PHRASE =
  'DO NOT EVER SIGN THIS TEXT WITH YOUR PRIVATE KEYS! IT IS ONLY USED FOR DERIVATION OF LNURL-AUTH HASHING-KEY, DISCLOSING ITS SIGNATURE WILL COMPROMISE YOUR LNURL-AUTH IDENTITY AND MAY LEAD TO LOSS OF FUNDS!'

export async function getHashingKey() {
  const lnApi = lightning.getLn()
  const { zbase: signedMessage } = await lnApi.signMessage(CANONICAL_PHRASE)

  const hashingKey = sha256(signedMessage).toString(Hex)

  return hashingKey
}

export async function getAuthSigner(host: string) {
  const hashingKey = await getHashingKey()
  const linkingPrivKey = hmacSHA256(host, Hex.parse(hashingKey)).toString(Hex)
  return new Signer(linkingPrivKey)
}

class Signer {
  public privateKey: Uint8Array
  public publicKey: string

  constructor(k: string) {
    this.privateKey = hexStringToByte(k)
    this.publicKey = toHexString(secp256k1.publicKeyCreate(hexStringToByte(k)))
  }

  /** Returns a hex encoded DER formatted signature */
  public sign(message: string): string {
    const { signature } = secp256k1.ecdsaSign(hexStringToByte(message), this.privateKey)

    const DER = secp256k1.signatureExport(signature)
    return toHexString(DER)
  }
}

const usernameRegex = /^[a-z0-9-_.]+$/

const domainRegex =
  /^((?!-))(xn--)?[a-z0-9][a-z0-9-_]{0,61}[a-z0-9]{0,1}\.(xn--)?([a-z0-9-]{1,61}|[a-z0-9-]{1,30}\.[a-z]{2,})$/

export function decodeLightningAddress(val: string): { username: string; domain: string } | null {
  const [username, domain] = val.split('@')

  // check valid username && valid domain
  if (!usernameRegex.test(username) || !domainRegex.test(domain)) {
    return null
  }

  return { username, domain }
}
