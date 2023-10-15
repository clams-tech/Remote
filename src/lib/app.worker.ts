import jsQR from 'jsqr'
import { endOfDay } from 'date-fns'
import { inPlaceSort } from 'fast-sort'
import { formatDate } from './dates.js'

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
      requestAnimationFrame(() => self.postMessage({ id, result: qrData?.data }))
      return
    }
    case 'sort-daily-chunks': {
      const { items, direction } = data

      const map = items.reduce((acc, item) => {
        const date = new Date(item.timestamp * 1000)
        const dateKey = endOfDay(date).getTime() / 1000
        acc.set(dateKey, [...(acc.get(dateKey) || []), item])

        return acc
      }, new Map() as ItemsMap)

      const dailyPaymentChunks = inPlaceSort(Array.from(map.entries()))[direction](
        ([timestamp]) => timestamp
      )

      const sortedChunks = await Promise.all(
        dailyPaymentChunks.map(async ([date, items]) => {
          const formattedDate = await formatDate(date)

          return [formattedDate, inPlaceSort(items).desc(({ timestamp }) => timestamp)]
        })
      )

      self.postMessage({ id, result: sortedChunks })

      return
    }
  }
}

type ItemsMap = Map<number, (unknown & { timestamp: number })[]>

export {}
