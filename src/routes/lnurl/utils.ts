import { secp256k1 } from '@noble/curves/secp256k1'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'
import { sha256 } from '@noble/hashes/sha256'
import { hmac } from '@noble/hashes/hmac'
import { hostRegex, usernameRegex } from '$lib/regex.js'

export const CANONICAL_PHRASE =
  'DO NOT EVER SIGN THIS TEXT WITH YOUR PRIVATE KEYS! IT IS ONLY USED FOR DERIVATION OF LNURL-AUTH HASHING-KEY, DISCLOSING ITS SIGNATURE WILL COMPROMISE YOUR LNURL-AUTH IDENTITY AND MAY LEAD TO LOSS OF FUNDS!'

export async function getAuthSigner(
  host: string,
  /** signed CANONICAL_PHRASE */
  signedMessage: string
) {
  const hashingKey = sha256(signedMessage)
  const linkingPrivKey = bytesToHex(hmac(sha256, hashingKey, host))
  return new Signer(linkingPrivKey)
}

class Signer {
  public privateKey: Uint8Array
  public publicKey: string

  constructor(k: string) {
    this.privateKey = hexToBytes(k)
    this.publicKey = bytesToHex(secp256k1.getPublicKey(k, true))
  }

  /** Returns a hex encoded DER formatted signature */
  public sign(message: string): string {
    const signature = secp256k1.sign(message, this.privateKey)
    return signature.toDERHex()
  }
}

export const decodeLightningAddress = (
  val: string
): { username: string; domain: string } | null => {
  const [username, domain] = val.split('@')
  if (!username || !domain) return null

  // check valid username && valid domain
  if (!usernameRegex.test(username) || !hostRegex.test(domain)) {
    return null
  }

  return { username, domain }
}
