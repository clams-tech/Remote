import { Buffer } from 'buffer'

class CipherBase {
  constructor(digest) {
    if (digest) {
      this.digest = this.finalFunc
    } else {
      this.final = this.finalFunc
    }

    // ;['_readableState', '_writableState', '_transformState'].forEach(function (prop) {
    //   Object.defineProperty(CipherBase.prototype, prop, {
    //     get: function () {
    //       Transform.call(this)
    //       return this[prop]
    //     },
    //     set: function (val) {
    //       Object.defineProperty(this, prop, {
    //         value: val,
    //         enumerable: true,
    //         configurable: true,
    //         writable: true
    //       })
    //     },
    //     configurable: true,
    //     enumerable: true
    //   })
    // })
  }

  update(data, inputEnc, outputEnc) {
    if (typeof data === 'string') {
      data = new Buffer(data, inputEnc)
    }
    let outData = this._update(data) || new Buffer('')

    if (outputEnc) {
      outData = outData.toString(outputEnc)
    }
    if (this.digest) {
      return this
    }
    return outData
  }
  _transform(data, _, next) {
    this.push(this._update(data))
    next()
  }
  _flush(next) {
    try {
      this.push(this._final())
    } catch (e) {
      return next(e)
    }
    next()
  }
  finalFunc(outputEnc) {
    let outData = this._final() || new Buffer('')

    if (outputEnc) {
      outData = outData.toString(outputEnc)
    }
    return outData
  }
}

export default CipherBase
