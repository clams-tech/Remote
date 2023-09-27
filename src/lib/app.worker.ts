import jsQR from 'jsqr'
import type { Filter, Payment, Sorter, TagFilter } from './@types/common.js'
import { endOfDay } from 'date-fns'
import { inPlaceSort } from 'fast-sort'
import { db } from './db/index.js'

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

type SortDailyPaymentChunksMessage = MessageBase & {
  type: 'sort-daily-payment-chunks'
  payments: Payment[]
  direction: 'asc' | 'desc'
}

type FilterItemsMessage = MessageBase & {
  type: 'filter-items'
  items: unknown[]
  filters: Filter[]
  tagFilters: TagFilter[]
}

type SortItemsMessage = MessageBase & {
  type: 'sort-items'
  items: unknown[]
  sorter: Sorter
}

type Message = QrMessage | SortDailyPaymentChunksMessage | FilterItemsMessage | SortItemsMessage

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
    case 'sort-daily-payment-chunks': {
      const { payments, direction } = data

      const map = payments.reduce((acc, payment) => {
        const date = new Date(payment.timestamp * 1000)
        const dateKey = endOfDay(date).getTime() / 1000
        acc.set(dateKey, [...(acc.get(dateKey) || []), payment])

        return acc
      }, new Map() as PaymentsMap)

      const dailyPaymentChunks = inPlaceSort(Array.from(map.entries()))[direction](
        ([timestamp]) => timestamp
      )

      self.postMessage({ id, result: dailyPaymentChunks })

      return
    }
    case 'filter-items': {
      const { items, filters, tagFilters } = data
      const processedItems: unknown[] = []

      // FILTER
      for (const item of items) {
        const id = (item as { id: string }).id
        const metadata = await db.metadata.get(id)

        const passesAllFilters = filters.every(({ values }) => {
          const checked = values.filter(({ checked }) => checked)
          return checked.length
            ? checked.some(({ predicate: { key, values, compare = 'eq' } }) => {
                switch (compare) {
                  case 'eq': {
                    return values.includes((item as Record<string, unknown>)[key])
                  }
                  case 'exists': {
                    return !!(item as Record<string, unknown>)[key]
                  }
                  case 'gt': {
                    return values.some(val => (item as Record<string, number>)[key] > Number(val))
                  }
                  case 'lt': {
                    return values.some(val => (item as Record<string, number>)[key] < Number(val))
                  }
                }
              })
            : true
        })

        const passesAllTagFilters = metadata
          ? tagFilters
              .filter(({ checked }) => checked)
              .some(({ tag }) => metadata!.tags.includes(tag))
          : true

        if (passesAllFilters && passesAllTagFilters) {
          processedItems.push(item)
        }
      }

      self.postMessage({ id, result: processedItems })

      return
    }
    case 'sort-items': {
      const { items, sorter } = data

      const sorted = inPlaceSort(items)[sorter.direction](
        i => (i as Record<string, unknown>)[sorter.key]
      )

      self.postMessage({ id, result: sorted })

      return
    }
  }
}

type PaymentsMap = Map<number, Payment[]>

export {}
