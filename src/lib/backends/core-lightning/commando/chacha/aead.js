import { Buffer } from 'buffer'
import CipherBase from './cipherbase'
import Chacha20 from './chacha20'
import Poly1305 from './poly1305'

class Cipher extends CipherBase {
  constructor(key, iv, decrypt) {
    super()

    this.alen = 0
    this.clen = 0
    this.chacha = new Chacha20(key, iv)
    this.poly = new Poly1305(this.chacha.getBytes(64))
    this.tag = null
    this._decrypt = decrypt
    this._hasData = false
  }

  setAAD(aad) {
    if (this._hasData) {
      throw new Error('Attempting to set AAD in unsupported state')
    }
    this.alen = aad.length
    this.poly.update(aad)
    const padding = new Buffer(padAmount(this.alen))
    if (padding.length) {
      padding.fill(0)
      this.poly.update(padding)
    }
  }
  _update(chunk) {
    if (!this._hasData) {
      this._hasData = true
    }
    const len = chunk.length

    if (!len) {
      return
    }
    this.clen += len
    const pad = this.chacha.getBytes(len)

    let i = -1
    while (++i < len) {
      pad[i] ^= chunk[i]
    }
    if (this._decrypt) {
      this.poly.update(chunk)
    } else {
      this.poly.update(pad)
    }
    return pad
  }
  _final() {
    if (this._decrypt && !this.tag) {
      throw new Error('Unsupported state or unable to authenticate data')
    }
    const padding = new Buffer(padAmount(this.clen))
    if (padding.length) {
      padding.fill(0)
      this.poly.update(padding)
    }
    const lens = new Buffer(16)
    lens.fill(0)
    lens.writeUInt32LE(this.alen, 0)
    lens.writeUInt32LE(this.clen, 8)
    const tag = this.poly.update(lens).finish()
    if (this._decrypt) {
      if (xorTest(tag, this.tag)) {
        throw new Error('Unsupported state or unable to authenticate data')
      }
    } else {
      this.tag = tag
    }

    return tag
  }
  getAuthTag() {
    if (this._decrypt || this.tag === null) {
      return new Buffer('')
    }
    return this.tag
  }
  setAuthTag(tag) {
    if (this._decrypt) {
      this.tag = tag
    } else {
      throw new Error('Attempting to set auth tag in unsupported state')
    }
  }
}

function padAmount(len) {
  const rem = len % 16
  if (!rem) {
    return 0
  }
  return 16 - rem
}

function xorTest(a, b) {
  let out = 0
  if (a.length !== b.length) {
    out++
  }
  const len = Math.min(a.length, b.length)
  let i = -1
  while (++i < len) {
    out += a[i] ^ b[i]
  }
  return out
}

export function createDecipher(key, iv) {
  return new Cipher(key, iv, true)
}

export function createCipher(key, iv) {
  return new Cipher(key, iv)
}
