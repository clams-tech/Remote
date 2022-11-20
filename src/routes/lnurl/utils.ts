import secp256k1 from 'secp256k1'
import sha256 from 'crypto-js/sha256'
import hmacSHA256 from 'crypto-js/hmac-sha256'
import Hex from 'crypto-js/enc-hex'
import lightning from '$lib/lightning'
import { CANONICAL_PHRASE } from './constants'
import { hexStringToByte, toHexString } from '$lib/utils'

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
  public privateKey: string
  public publicKey: string

  constructor(k: string) {
    this.privateKey = k
    this.publicKey = toHexString(secp256k1.publicKeyCreate(hexStringToByte(k)))
  }

  /** Returns a hex encoded DER formatted signature */
  public sign(message: string): string {
    const { signature } = secp256k1.ecdsaSign(
      hexStringToByte(message),
      hexStringToByte(this.privateKey)
    )

    const DER = secp256k1.signatureExport(signature)
    return toHexString(DER)
  }
}
