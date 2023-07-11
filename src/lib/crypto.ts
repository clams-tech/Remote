import AES from 'crypto-js/aes'
import encUtf8 from 'crypto-js/enc-utf8'
import { randomBytes, bytesToHex } from '@noble/hashes/utils'

export const encryptWithAES = (text: string, passphrase: string) => {
  return AES.encrypt(text, passphrase).toString()
}

export const decryptWithAES = (ciphertext: string, passphrase: string) => {
  const bytes = AES.decrypt(ciphertext, passphrase)
  const originalText = bytes.toString(encUtf8)
  return originalText
}

export function createRandomHex(length = 32) {
  return bytesToHex(randomBytes(length))
}
