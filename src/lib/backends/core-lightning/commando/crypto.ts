import CryptoJS from 'crypto-js'
import { Buffer } from 'buffer'
import * as secp from '@noble/secp256k1'
import secp256k1 from 'secp256k1'
import { createCipher, createDecipher } from './chacha/aead'

export function ecdh(pubkey: Uint8Array, privkey: Uint8Array) {
  return Buffer.from(secp256k1.ecdh(pubkey, privkey))
}

export function hmacHash(key: Buffer, input: Buffer) {
  const words = CryptoJS.HmacSHA256(
    CryptoJS.enc.Hex.parse(input.toString('hex')),
    CryptoJS.enc.Hex.parse(key.toString('hex'))
  )

  return Buffer.from(CryptoJS.enc.Hex.stringify(words), 'hex')
}

export async function sha256(input: Buffer): Promise<Buffer> {
  const hash = await secp.utils.sha256(input)
  return Buffer.from(hash)
}

export function hkdf(ikm: Buffer, len: number, salt = Buffer.alloc(0), info = Buffer.alloc(0)) {
  // extract step
  const prk = hmacHash(salt, ikm)

  // expand
  const n = Math.ceil(len / prk.byteLength)
  if (n > 255) throw new Error('Output length exceeds maximum')

  const t = [Buffer.alloc(0)]

  for (let i = 1; i <= n; i++) {
    const tp = t[t.length - 1]
    const bi = Buffer.from([i])
    t.push(hmacHash(prk, Buffer.concat([tp, info, bi])))
  }

  return Buffer.concat(t.slice(1)).subarray(0, len)
}

export function getPublicKey(privKey: Buffer, compressed = true) {
  return Buffer.from(secp.getPublicKey(privKey, compressed))
}

/**
 * Encrypt data using authenticated encryption with associated data (AEAD)
 * ChaCha20-Poly1305.
 *
 * @param k private key, 64-bytes
 * @param n nonce, 12-bytes
 * @param ad associated data
 * @param plaintext raw data to encrypt
 * @returns encrypted data + tag as a variable length buffer
 */
export function ccpEncrypt(k: Buffer, n: Buffer, ad: Buffer, plaintext: Buffer): Buffer {
  const cipher = createCipher(k, n)
  cipher.setAAD(ad)

  const pad = cipher.update(plaintext)

  cipher.final && cipher.final()
  const tag = cipher.getAuthTag()
  return Buffer.concat([pad, tag])
}

/**
 * Decrypt data uusing authenticated encryption with associated data (AEAD)
 * ChaCha20-Poly1305
 *
 * @param k private key, 64-bytes
 * @param n nonce, 12-bytes
 * @param ad associated data, variable length
 * @param ciphertext encrypted data to decrypt
 * @returns decrypteed data as a variable length Buffer
 */
export function ccpDecrypt(k: Buffer, n: Buffer, ad: Buffer, ciphertext: Buffer) {
  const decipher = createDecipher(k, n)

  decipher.setAAD(ad)

  if (ciphertext.length === 16) {
    decipher.setAuthTag(ciphertext)
    return decipher.final && decipher.final()
  }
  if (ciphertext.length > 16) {
    const tag = ciphertext.subarray(ciphertext.length - 16)
    const pad = ciphertext.subarray(0, ciphertext.length - 16)
    decipher.setAuthTag(tag)
    let m = decipher.update(pad)
    const f = decipher.final && decipher.final()
    m = Buffer.concat([m as Buffer, f as Buffer])
    return m
  }
}
