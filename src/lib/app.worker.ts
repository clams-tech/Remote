import jsQR from 'jsqr'

type MessageBase = {
  id: string
}

type QrMessage = MessageBase & {
  type: 'qr-process'
  qr: {
    data: Uint8ClampedArray
    width: number
    height: number
  }
}

type SortDailyChunksMessage = MessageBase & {
  type: 'sort-daily-chunks'
  items: (unknown & { timestamp: number })[]
  direction: 'asc' | 'desc'
}

type Message = QrMessage | SortDailyChunksMessage

onmessage = async (message: MessageEvent<Message>) => {
  const { data } = message
  const { id, type } = data

  switch (type) {
    case 'qr-process': {
      const { qr } = data
      const qrData = jsQR(qr.data, qr.width, qr.height)
      self.postMessage({ id, result: qrData?.data })
      return
    }
  }
}

export {}
