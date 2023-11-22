import { filter, firstValueFrom, fromEvent, map } from 'rxjs'
import { createRandomHex } from '$lib/crypto.js'
import type { Channel } from '$lib/@types/channels.js'
import type { GetSortedFilteredItemsOptions } from '$lib/@types/common.js'
import type { Tag } from '$lib/@types/metadata.js'
import type { InvoicePayment, TransactionPayment } from '$lib/@types/payments.js'

const worker = new Worker(new URL('./db.worker.ts', import.meta.url), {
  type: 'module'
})

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

export const updateTransactions = async (transactions: TransactionPayment[]): Promise<void> => {
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

export const updateAddresses = async (): Promise<void> => {
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

  worker.postMessage({ id, type: 'update_addresses' })

  return complete
}

export const updateInvoices = async (): Promise<void> => {
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

  worker.postMessage({ id, type: 'update_invoices' })

  return complete
}

export const updateTableItems = async (table: string, data: unknown[]): Promise<void> => {
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

  worker.postMessage({ id, type: 'update_table_items', table, data })

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

export const getLastPaidInvoice = async (walletId: string): Promise<InvoicePayment> => {
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

  return complete as Promise<InvoicePayment>
}

export const getAllTags = (): Promise<Tag[]> => {
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

  worker.postMessage({ id, type: 'get_all_tags' })

  return complete as Promise<Tag[]>
}

export const getSortedFilteredItems = async (
  options: GetSortedFilteredItemsOptions
): Promise<unknown[]> => {
  const { limit, sort, filters, tags, lastItem, table, lastItemKey } = options
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

  worker.postMessage({
    id,
    type: 'get_filtered_sorted_items',
    limit,
    sort,
    filters,
    tags,
    table,
    lastItem,
    lastItemKey
  })

  return complete as Promise<unknown[]>
}
