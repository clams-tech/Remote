import AES from 'crypto-js/aes'
import encUtf8 from 'crypto-js/enc-utf8'
import { randomBytes, bytesToHex } from '@noble/hashes/utils'
import { sha256 } from '@noble/hashes/sha256'
import { secp256k1 } from '@noble/curves/secp256k1'

export const encryptWithAES = (text: string, passphrase: string) => {
  return AES.encrypt(text, passphrase).toString()
}

export const decryptWithAES = (ciphertext: string, passphrase: string) => {
  const bytes = AES.decrypt(ciphertext, passphrase)
  const originalText = bytes.toString(encUtf8)
  return originalText
}

export const createRandomHex = (length = 32) => {
  return bytesToHex(randomBytes(length))
}

export const hash = (msg: string) => bytesToHex(sha256(msg))

export const createSecret = (): string => bytesToHex(secp256k1.utils.randomPrivateKey())

export const getPublicKey = (privKey: string): string =>
  bytesToHex(secp256k1.getPublicKey(privKey, true))
