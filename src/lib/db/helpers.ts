import { filter, firstValueFrom, fromEvent, map } from 'rxjs'
import DbWorker from './db.worker?worker'
import { createRandomHex } from '$lib/crypto.js'
import type { Channel } from '$lib/@types/channels.js'
import type { Transaction } from '$lib/@types/transactions.js'
import type { Invoice } from '$lib/@types/invoices.js'

const worker = new DbWorker()
const messages$ = fromEvent<MessageEvent>(worker, 'message')

export const updateChannels = async (channels: Channel[]): Promise<void> => {
  const id = createRandomHex()

  const complete = firstValueFrom(
    messages$.pipe(
      filter(message => message.data.id === id),
      map(message => {
        if (message.data.error) {
          throw new Error(message.data.error)
        }
      })
    )
  )

  worker.postMessage({ id, type: 'update_channels', channels })

  return complete
}

export const updateTransactions = async (transactions: Transaction[]): Promise<void> => {
  const id = createRandomHex()

  const complete = firstValueFrom(
    messages$.pipe(
      filter(message => message.data.id === id),
      map(message => {
        if (message.data.error) {
          throw new Error(message.data.error)
        }
      })
    )
  )

  worker.postMessage({ id, type: 'update_transactions', transactions })

  return complete
}

export const bulkPut = async (table: string, data: unknown[]): Promise<void> => {
  const id = createRandomHex()

  const complete = firstValueFrom(
    messages$.pipe(
      filter(message => message.data.id === id),
      map(message => {
        if (message.data.error) {
          throw new Error(message.data.error)
        }
      })
    )
  )

  worker.postMessage({ id, type: 'bulk_put', table, data })

  return complete
}

export const getLastPaidInvoice = async (walletId: string): Promise<Invoice> => {
  const id = createRandomHex()

  const complete = firstValueFrom(
    messages$.pipe(
      filter(message => message.data.id === id),
      map(message => {
        if (message.data.error) {
          throw new Error(message.data.error)
        }

        return message.data.result
      })
    )
  )

  worker.postMessage({ id, type: 'get_lastpay_index', walletId })

  return complete as Promise<Invoice>
}
