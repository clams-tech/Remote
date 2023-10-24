import type { Channel } from '$lib/@types/channels.js'
import type { Transaction } from '$lib/@types/transactions.js'
import { debounceTime, from } from 'rxjs'
import { db } from './index.js'
import { liveQuery } from 'dexie'
import type { Invoice } from '$lib/@types/invoices.js'
import { getNetwork } from '$lib/utils.js'
import type { Payment, PaymentStatus } from '$lib/@types/common.js'
import {
  deriveAddressSummary,
  deriveInvoiceSummary,
  deriveTransactionSummary,
  type PaymentSummary
} from '$lib/summary.js'
import type { Address } from '$lib/@types/addresses.js'

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

type GetPaymentSummaryMessage = MessageBase & {
  type: 'get_payment_summary'
  payment: Payment
}

type Message =
  | UpdateChannelsMessage
  | UpdateTransactionsMessage
  | BulkPutMessage
  | GetLastPayMessage
  | GetPaymentSummaryMessage

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
        const lastPaidInvoice = await db.invoices.orderBy('payIndex').reverse().first()
        self.postMessage({ id: message.data.id, result: lastPaidInvoice })
      } catch (error) {
        const { message: errMsg } = error as Error
        self.postMessage({ id: message.data.id, error: errMsg })
      }

      return
    }
    case 'get_payment_summary': {
      const { payment } = message.data

      let summary: PaymentSummary

      try {
        if (payment.type === 'transaction') {
          summary = await deriveTransactionSummary(payment.data as Transaction)
        } else if (payment.type === 'invoice') {
          summary = await deriveInvoiceSummary(payment.data as Invoice)
        } else {
          summary = await deriveAddressSummary(payment.data as Address)
        }

        self.postMessage({ id: message.data.id, result: summary })
      } catch (error) {
        const { message: errMsg } = error as Error
        self.postMessage({ id: message.data.id, error: errMsg })
      }

      return
    }
  }
}

const payments$ = from(
  liveQuery(() => {
    return db.transaction(
      'r',
      db.invoices,
      db.transactions,
      db.addresses,
      db.utxos,
      db.channels,
      async () => {
        const invoices = db.invoices
          .toArray()
          .then(invs =>
            Array.from(
              invs
                .reduce((acc, inv) => {
                  const current = acc.get(inv.hash)

                  // if duplicates (we are both parties to invoice), keep the sender copy
                  if (!current || current.direction === 'receive') {
                    acc.set(inv.hash, inv)
                  }

                  return acc
                }, new Map<string, Invoice>())
                .values()
            )
          )
          .then(invs =>
            invs.map(data => {
              const { id, status, completedAt, createdAt, amount, request, fee, walletId, offer } =
                data
              return {
                id,
                type: 'invoice' as const,
                status,
                timestamp: completedAt || createdAt,
                walletId,
                amount,
                network: request ? getNetwork(request) : 'bitcoin',
                fee,
                offer: !!offer,
                data
              }
            })
          )

        const transactions = db.transactions
          .toArray()
          .then(async txs => {
            const deduped: Map<string, Transaction> = new Map()

            for (const tx of txs) {
              const current = deduped.get(tx.id)

              // dedupes txs and prefers the tx where if a channel close, the closer or the wallet that is the sender (spender of an input utxo)
              if (current) {
                const spentInputUtxo = await db.utxos
                  .where('id')
                  .anyOf(tx.inputs.map(({ txid, index }) => `${txid}:${index}`))
                  .first()

                let channel: Channel | undefined

                if (tx.channel) {
                  const channels = await db.channels.where({ id: tx.channel.id }).toArray()
                  channel = channels.find(
                    ({ opener, closer }) =>
                      ((tx.channel?.type === 'close' || tx.channel?.type === 'force_close') &&
                        closer === 'local') ||
                      opener === 'local'
                  )
                }

                // favour channel closer or opener
                if (channel?.walletId === tx.walletId) {
                  deduped.set(tx.id, tx)
                } else if (spentInputUtxo?.walletId === tx.walletId) {
                  // favour spender
                  deduped.set(tx.id, tx)
                }
              } else {
                deduped.set(tx.id, tx)
              }
            }

            return Array.from(deduped.values())
          })
          .then(txs =>
            txs.map(data => {
              const { id, timestamp, blockheight, outputs, fee, walletId, channel } = data
              return {
                id,
                type: 'transaction' as const,
                status: (blockheight ? 'complete' : 'pending') as PaymentStatus,
                timestamp,
                walletId,
                network: getNetwork(outputs[0].address),
                fee,
                channel: !!channel,
                data
              }
            })
          )

        const addresses = db.addresses
          .filter(({ txid }) => !txid)
          .toArray()
          .then(addrs =>
            addrs.map(data => {
              const { id, createdAt, walletId, amount, value } = data
              return {
                id,
                type: 'address' as const,
                status: 'waiting' as PaymentStatus,
                timestamp: createdAt,
                walletId,
                amount,
                network: getNetwork(value),
                data
              }
            })
          )

        return Promise.all([invoices, transactions, addresses]).then(results => results.flat())
      }
    )
  })
)

payments$
  .pipe(debounceTime(250))
  .subscribe(payments => self.postMessage({ id: 'payments$', result: payments }))

export {}
