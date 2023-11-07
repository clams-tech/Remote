import type { Channel } from '$lib/@types/channels.js'
import { db } from './index.js'
import type { DBGetForwardsOptions, DBGetPaymentsOptions, ValueOf } from '$lib/@types/common.js'
import type { Collection } from 'dexie'
import { endOfDay } from 'date-fns'
import { formatDate } from '$lib/dates.js'

import type {
  AddressPayment,
  Payment,
  PaymentWithSummary,
  TransactionPayment
} from '$lib/@types/payments.js'

import {
  deriveAddressSummary,
  deriveInvoiceSummary,
  deriveTransactionSummary,
  type PaymentSummary
} from '$lib/summary.js'
import type { Forward } from '$lib/@types/forwards.js'

type MessageBase = {
  id: string
}

type UpdateChannelsMessage = MessageBase & {
  type: 'update_channels'
  channels: Channel[]
}

type UpdateTransactionsMessage = MessageBase & {
  type: 'update_transactions'
  transactions: TransactionPayment[]
}

type UpdateTableItemsMessage = MessageBase & {
  type: 'update_table_items'
  table: string
  data: unknown[]
}

type BulkPutMessage = MessageBase & {
  type: 'bulk_put'
  table: string
  data: unknown[]
}

type GetLastPayMessage = MessageBase & {
  type: 'get_lastpay_index'
  walletId: string
}

type GetDailyPaymentsMessage = MessageBase & {
  type: 'get_daily_payments'
} & DBGetPaymentsOptions

type GetDailyForwardsMessage = MessageBase & {
  type: 'get_daily_forwards'
} & DBGetForwardsOptions

type GetAllTagsMessage = MessageBase & {
  type: 'get_all_tags'
}

type Message =
  | UpdateChannelsMessage
  | UpdateTransactionsMessage
  | UpdateTableItemsMessage
  | GetLastPayMessage
  | GetAllTagsMessage
  | GetDailyPaymentsMessage
  | GetDailyForwardsMessage
  | BulkPutMessage

onmessage = async (message: MessageEvent<Message>) => {
  switch (message.data.type) {
    case 'update_channels': {
      try {
        await Promise.all(
          message.data.channels.map(async channel => {
            // need to update channels as old channels lose data after 100 blocks of being close
            // so we don't want to overwrite data we already have as it is useful
            await db.channels
              .where({ id: channel.id, walletId: channel.walletId })
              .modify(channel)
              .then(async updated => {
                if (!updated) {
                  await db.channels.add(channel)
                }
              })
          })
        )

        self.postMessage({ id: message.data.id })
      } catch (error) {
        const { message: errMsg } = error as Error
        self.postMessage({ id: message.data.id, error: errMsg })
      }

      return
    }
    case 'update_transactions': {
      try {
        const { transactions } = message.data

        if (transactions.length) {
          const addressesWithoutTxid = await db.payments
            .where({ walletId: transactions[0].walletId, type: 'address' })
            .filter(payment => !(payment as AddressPayment).data.txid)
            .toArray()

          // update all addresses that have a corresponding tx
          await Promise.all(
            addressesWithoutTxid.map(address => {
              const tx = transactions.find(transaction =>
                (transaction as TransactionPayment).data.outputs.find(
                  output => output.address === address.id
                )
              )

              if (tx) {
                return db.payments.update(address.id, {
                  data: { txid: tx.id, completedAt: tx.timestamp }
                })
              }

              return Promise.resolve()
            })
          )
          await Promise.all(
            transactions.map(transaction =>
              db.payments.update(transaction.id, transaction).then(updated => {
                !updated && db.payments.put(transaction)
              })
            )
          )
        }

        self.postMessage({ id: message.data.id })
      } catch (error) {
        const { message: errMsg } = error as Error
        self.postMessage({ id: message.data.id, error: errMsg })
      }

      return
    }
    case 'bulk_put': {
      try {
        // eslint-disable-next-line
        // @ts-ignore
        await db[message.data.table].bulkPut(message.data.data)
        self.postMessage({ id: message.data.id })
      } catch (error) {
        const { message: errMsg } = error as Error
        self.postMessage({ id: message.data.id, error: errMsg })
      }

      return
    }
    case 'update_table_items': {
      try {
        const table = message.data.table
        const { data } = message.data

        /**
         * Try to update item in db so as to not overwrite
         * any metadata that may be there. if item is new and
         * cannot be updated, then put in the db.
         */
        await Promise.all(
          data.map(val =>
            // eslint-disable-next-line
            // @ts-ignore
            db[table].update(val.id, val).then(updated => {
              if (!updated) {
                // eslint-disable-next-line
                // @ts-ignore
                return db[table].put(val)
              }
            })
          )
        )

        self.postMessage({ id: message.data.id })
      } catch (error) {
        const { message: errMsg } = error as Error
        self.postMessage({ id: message.data.id, error: errMsg })
      }

      return
    }
    case 'get_lastpay_index': {
      try {
        const lastPaidInvoice = await db.payments.orderBy('data.payIndex').reverse().first()
        self.postMessage({ id: message.data.id, result: lastPaidInvoice })
      } catch (error) {
        const { message: errMsg } = error as Error
        self.postMessage({ id: message.data.id, error: errMsg })
      }

      return
    }
    case 'get_all_tags': {
      const tags = await db.tags.toArray()
      self.postMessage({ id: message.data.id, result: tags })

      return
    }
    case 'get_daily_payments': {
      const { offset, limit, sort, filters, tags, lastPayment } = message.data

      // A helper function we will use below.
      // It will prevent the same results to be returned again for next page.
      const fastForward = (
        lastRow: Payment,
        idProp: keyof Payment,
        otherCriterion: (payment: Payment) => boolean
      ) => {
        let fastForwardComplete = false
        return (item: Payment) => {
          if (fastForwardComplete) return otherCriterion(item)
          if (item[idProp] === lastRow[idProp]) {
            fastForwardComplete = true
          }
          return false
        }
      }

      const filter = (payment: Payment) => {
        if (tags.length) {
          if (!payment.metadata || !payment.metadata.tags.length) return false
          const validTag = payment.metadata.tags.some(tag => tags.includes(tag))
          if (!validTag) return false
        }

        return filters.every(filter => {
          const { type, key } = filter
          const keys = key.split('.')

          let valueToTest: ValueOf<Payment> = payment[keys[0] as keyof Payment]

          if (keys.length > 1) {
            valueToTest = keys.slice(1).reduce((acc, key) => {
              const res = acc ? acc[key as keyof ValueOf<Payment>] : acc
              return res
            }, valueToTest as ValueOf<Payment>)
          }

          if (type === 'exists' && filter.applied && !valueToTest) return false

          if (type === 'one-of') {
            const applied = filter.values.filter(({ applied }) => applied)

            if (applied.length && !applied.some(({ value }) => value === valueToTest)) {
              return false
            }
          }

          if (type === 'amount-range') {
            const {
              values: { gt, lt }
            } = filter

            if (gt && (valueToTest as number) <= gt) return false
            if (lt && (valueToTest as number) >= lt) return false
          }

          if (type === 'date-range') {
            const {
              values: { gt, lt }
            } = filter

            if (gt && (valueToTest as number) <= gt.getTime() / 1000) return false
            if (lt && (valueToTest as number) >= lt.getTime() / 1000) return false
          }

          return true
        })
      }

      let collection: Collection<Payment>

      if (offset > 0 && lastPayment) {
        if (sort.direction === 'asc') {
          collection = db.payments
            .where(sort.key)
            .aboveOrEqual(lastPayment[sort.key as keyof Payment])
            .filter(fastForward(lastPayment, sort.key as keyof Payment, filter))
        } else {
          collection = db.payments
            .where(sort.key)
            .belowOrEqual(lastPayment[sort.key as keyof Payment])
            .filter(fastForward(lastPayment, sort.key as keyof Payment, filter))
        }
      } else {
        collection = db.payments.orderBy(sort.key).filter(filter)
      }

      if (sort.direction === 'desc') {
        collection.reverse()
      }

      const payments = await collection.distinct().offset(offset).limit(limit).toArray()

      const paymentsWithSummary: PaymentWithSummary[] = await Promise.all(
        payments.map(async payment => {
          const summary = await getSummary(payment)
          return { ...payment, summary }
        })
      )

      const sortedDailyChunks = await sortDailyChunks(paymentsWithSummary)

      self.postMessage({ id: message.data.id, result: sortedDailyChunks })
      return
    }
    case 'get_daily_forwards': {
      const { offset, limit, sort, filters, tags, lastForward } = message.data

      // A helper function we will use below.
      // It will prevent the same results to be returned again for next page.
      const fastForward = (
        lastRow: Forward,
        idProp: keyof Forward,
        otherCriterion: (forward: Forward) => boolean
      ) => {
        let fastForwardComplete = false
        return (item: Forward) => {
          if (fastForwardComplete) return otherCriterion(item)
          if (item[idProp] === lastRow[idProp]) {
            fastForwardComplete = true
          }
          return false
        }
      }

      const filter = (forward: Forward) => {
        if (tags.length) {
          if (!forward.metadata || !forward.metadata.tags.length) return false
          const validTag = forward.metadata.tags.some(tag => tags.includes(tag))
          if (!validTag) return false
        }

        return filters.every(filter => {
          const { type, key } = filter
          const keys = key.split('.')

          let valueToTest: ValueOf<Forward> = forward[keys[0] as keyof Forward]

          if (keys.length > 1) {
            valueToTest = keys.slice(1).reduce((acc, key) => {
              const res = acc ? acc[key as keyof ValueOf<Forward>] : acc
              return res
            }, valueToTest as ValueOf<Forward>)
          }

          if (type === 'exists' && filter.applied && !valueToTest) return false

          if (type === 'one-of') {
            const applied = filter.values.filter(({ applied }) => applied)

            if (applied.length && !applied.some(({ value }) => value === valueToTest)) {
              return false
            }
          }

          if (type === 'amount-range') {
            const {
              values: { gt, lt }
            } = filter

            if (gt && (valueToTest as number) <= gt) return false
            if (lt && (valueToTest as number) >= lt) return false
          }

          if (type === 'date-range') {
            const {
              values: { gt, lt }
            } = filter

            if (gt && (valueToTest as number) <= gt.getTime() / 1000) return false
            if (lt && (valueToTest as number) >= lt.getTime() / 1000) return false
          }

          return true
        })
      }

      let collection: Collection<Forward>

      if (offset > 0 && lastForward) {
        collection = db.forwards
          .where(sort.key)
          .aboveOrEqual(lastForward[sort.key as keyof Forward])
          .filter(fastForward(lastForward, sort.key as keyof Forward, filter))
      } else {
        collection = db.forwards.orderBy(sort.key).filter(filter)
      }

      const forwards = await collection.distinct().offset(offset).limit(limit).toArray()
      const sortedDailyChunks = await sortDailyChunks(forwards)

      self.postMessage({ id: message.data.id, result: sortedDailyChunks })
      return
    }
  }
}

type ItemsMap = Map<number, unknown[]>

const sortDailyChunks = async <T>(items: T[]) => {
  const itemsMap = items.reduce((acc, item) => {
    const date = new Date((item as { timestamp: number }).timestamp * 1000)
    const dateKey = endOfDay(date).getTime() / 1000
    acc.set(dateKey, [...(acc.get(dateKey) || []), item])

    return acc
  }, new Map() as ItemsMap)

  const sortedChunks = await Promise.all(
    Array.from(itemsMap.entries()).map(async ([date, items]) => {
      const formattedDate = await formatDate(date)

      return [formattedDate, items]
    })
  )

  return sortedChunks
}

const getSummary = async (payment: Payment): Promise<PaymentSummary | null> => {
  let summary: PaymentSummary

  try {
    if (payment.type === 'transaction') {
      summary = await deriveTransactionSummary(payment)
    } else if (payment.type === 'invoice') {
      summary = await deriveInvoiceSummary(payment)
    } else {
      summary = await deriveAddressSummary(payment)
    }

    return summary
  } catch (error) {
    return null
  }
}

export {}
