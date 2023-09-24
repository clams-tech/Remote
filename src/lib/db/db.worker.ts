import type { Channel } from '$lib/@types/channels.js'
import type { Transaction } from '$lib/@types/transactions.js'
import { db } from './index.js'

type MessageBase = {
  id: string
}

type UpdateChannelsMessage = MessageBase & {
  type: 'update_channels'
  channels: Channel[]
}

type UpdateTransactionsMessage = MessageBase & {
  type: 'update_transactions'
  transactions: Transaction[]
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

type Message =
  | UpdateChannelsMessage
  | UpdateTransactionsMessage
  | BulkPutMessage
  | GetLastPayMessage

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

        const addressesWithoutTxid = await db.addresses
          .where({ walletId: transactions[0].walletId })
          .filter(({ txid }) => !txid)
          .toArray()

        // update all addresses that have a corresponding tx
        await Promise.all(
          addressesWithoutTxid.map(address => {
            const tx = transactions.find(({ outputs }) =>
              outputs.find(output => output.address === address.value)
            )

            if (tx) {
              return db.addresses.update(address.id, { txid: tx.id, completedAt: tx.timestamp })
            }

            return Promise.resolve()
          })
        )

        await db.transactions.bulkPut(transactions)

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
    case 'get_lastpay_index': {
      try {
        const [lastPaidInvoice] = await db.invoices
          .where({ walletId: message.data.walletId, direction: 'receive' })
          .filter(({ payIndex }) => typeof payIndex !== 'undefined')
          .reverse()
          .sortBy('payIndex')

        self.postMessage({ id: message.data.id, result: lastPaidInvoice })
      } catch (error) {
        const { message: errMsg } = error as Error
        self.postMessage({ id: message.data.id, error: errMsg })
      }

      return
    }
  }
}

export {}
