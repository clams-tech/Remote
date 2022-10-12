import jsQR from 'jsqr'

onmessage = (e) => {
  const { data, width, height } = e.data
  const qrData = jsQR(data, width, height)
  self.postMessage(qrData)
}

export {}
