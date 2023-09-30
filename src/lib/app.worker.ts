import jsQR from 'jsqr'
import type { Filter, Payment, Sorter, TagFilter } from './@types/common.js'
import { endOfDay } from 'date-fns'
import { inPlaceSort } from 'fast-sort'
import { db } from './db/index.js'
import type { Forward } from './@types/forwards.js'
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

type SortDailyPaymentChunksMessage = MessageBase & {
  type: 'sort-daily-payment-chunks'
  payments: Payment[]
  direction: 'asc' | 'desc'
}

type SortDailyForwardChunksMessage = MessageBase & {
  type: 'sort-daily-forward-chunks'
  forwards: Forward[]
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

type Message =
  | QrMessage
  | SortDailyPaymentChunksMessage
  | SortDailyForwardChunksMessage
  | FilterItemsMessage
  | SortItemsMessage

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

      const sortedChunks = await Promise.all(
        dailyPaymentChunks.map(async ([date, payments]) => {
          const formattedDate = await formatDate(date)

          return [formattedDate, inPlaceSort(payments).desc(({ timestamp }) => timestamp)]
        })
      )

      self.postMessage({ id, result: sortedChunks })

      return
    }
    case 'sort-daily-forward-chunks': {
      const { forwards, direction } = data

      const map = forwards.reduce((acc, forward) => {
        const { completedAt, createdAt } = forward
        const date = new Date((completedAt || createdAt) * 1000)
        const dateKey = endOfDay(date).getTime() / 1000
        acc.set(dateKey, [...(acc.get(dateKey) || []), forward])

        return acc
      }, new Map() as ForwardsMap)

      const dailyForwardsChunks = inPlaceSort(Array.from(map.entries()))[direction](
        ([timestamp]) => timestamp
      )

      const sortedChunks = await Promise.all(
        dailyForwardsChunks.map(async ([date, forwards]) => {
          const formattedDate = await formatDate(date)

          return [
            formattedDate,
            inPlaceSort(forwards).desc(({ completedAt, createdAt }) => completedAt || createdAt)
          ]
        })
      )

      self.postMessage({ id, result: sortedChunks })

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
type ForwardsMap = Map<number, Forward[]>

export {}
