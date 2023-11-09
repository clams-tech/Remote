import type { Channel } from '$lib/@types/channels.js'
import { db } from './index.js'
import type { GetSortedFilteredItemsOptions, ValueOf } from '$lib/@types/common.js'
import type { Collection } from 'dexie'
import type { AddressPayment, Payment, TransactionPayment } from '$lib/@types/payments.js'

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

type GetSortedFilteredItemsMessage = MessageBase & {
  type: 'get_filtered_sorted_items'
} & GetSortedFilteredItemsOptions

type GetAllTagsMessage = MessageBase & {
  type: 'get_all_tags'
}

type Message =
  | UpdateChannelsMessage
  | UpdateTransactionsMessage
  | UpdateTableItemsMessage
  | GetLastPayMessage
  | GetAllTagsMessage
  | GetSortedFilteredItemsMessage
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
    case 'get_filtered_sorted_items': {
      const { offset, limit, sort, filters, tags, lastItem, table } = message.data

      // A helper function we will use below.
      // It will prevent the same results to be returned again for next page.
      const fastForward = <T>(
        lastRow: T,
        idProp: keyof T,
        otherCriterion: (item: T) => boolean
      ) => {
        let fastForwardComplete = false
        return (item: T) => {
          if (fastForwardComplete) return otherCriterion(item)
          if (item[idProp] === lastRow[idProp]) {
            fastForwardComplete = true
          }
          return false
        }
      }

      const filter = (item: unknown) => {
        if (tags.length) {
          // eslint-disable-next-line
          // @ts-ignore
          if (!item.metadata || !item.metadata.tags.length) return false
          // eslint-disable-next-line
          // @ts-ignore
          const validTag = item.metadata.tags.some(tag => tags.includes(tag))
          if (!validTag) return false
        }

        return filters.every(filter => {
          const { type, key } = filter
          const keys = key.split('.')

          // eslint-disable-next-line
          // @ts-ignore
          let valueToTest: ValueOf<typeof item> = item[keys[0]]

          if (keys.length > 1) {
            // eslint-disable-next-line
            // @ts-ignore
            valueToTest = keys.slice(1).reduce((acc, key) => {
              // eslint-disable-next-line
              // @ts-ignore
              const res = acc ? acc[key] : acc
              return res
            }, valueToTest)
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

      if (offset > 0 && lastItem) {
        if (sort.direction === 'asc') {
          // eslint-disable-next-line
          // @ts-ignore
          collection = db[table]
            .where(sort.key)
            // eslint-disable-next-line
            // @ts-ignore
            .aboveOrEqual(lastItem[sort.key])
            // eslint-disable-next-line
            // @ts-ignore
            .filter(fastForward(lastItem, sort.key, filter))
        } else {
          // eslint-disable-next-line
          // @ts-ignore
          collection = db[table]
            .where(sort.key)
            // eslint-disable-next-line
            // @ts-ignore
            .belowOrEqual(lastItem[sort.key])
            // eslint-disable-next-line
            // @ts-ignore
            .filter(fastForward(lastItem, sort.key, filter))
        }
      } else {
        collection = db.payments.orderBy(sort.key).filter(filter)
      }

      if (sort.direction === 'desc') {
        collection.reverse()
      }

      const items = await collection.distinct().offset(offset).limit(limit).toArray()

      self.postMessage({ id: message.data.id, result: items })
      return
    }
  }
}

export {}
