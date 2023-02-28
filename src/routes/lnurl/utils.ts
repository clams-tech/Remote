import secp256k1 from 'secp256k1'
import lightning from '$lib/lightning'
import { hexStringToByte } from '$lib/utils'
import { bytesToHex } from '@noble/hashes/utils'
import { sha256 } from '@noble/hashes/sha256'
import { hmac } from '@noble/hashes/hmac'

const CANONICAL_PHRASE =
  'DO NOT EVER SIGN THIS TEXT WITH YOUR PRIVATE KEYS! IT IS ONLY USED FOR DERIVATION OF LNURL-AUTH HASHING-KEY, DISCLOSING ITS SIGNATURE WILL COMPROMISE YOUR LNURL-AUTH IDENTITY AND MAY LEAD TO LOSS OF FUNDS!'

export async function getHashingKey() {
  const lnApi = lightning.getLn()
  const { zbase: signedMessage } = await lnApi.signMessage(CANONICAL_PHRASE)

  return sha256(signedMessage)
}

export async function getAuthSigner(host: string) {
  const hashingKey = await getHashingKey()
  const linkingPrivKey = bytesToHex(hmac(sha256, hashingKey, host))
  return new Signer(linkingPrivKey)
}

class Signer {
  public privateKey: Uint8Array
  public publicKey: string

  constructor(k: string) {
    this.privateKey = hexStringToByte(k)
    this.publicKey = bytesToHex(secp256k1.publicKeyCreate(hexStringToByte(k)))
  }

  /** Returns a hex encoded DER formatted signature */
  public sign(message: string): string {
    const { signature } = secp256k1.ecdsaSign(hexStringToByte(message), this.privateKey)

    const DER = secp256k1.signatureExport(signature)
    return bytesToHex(DER)
  }
}
