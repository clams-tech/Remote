import { fromEvent, type BehaviorSubject, firstValueFrom, filter, map } from 'rxjs'
import CoreLnWorker from './coreln.worker?worker'
import type { ConnectionStatus } from '../interfaces.js'
import { createRandomHex } from '$lib/crypto.js'
import type { CommandoRequest, LnWebSocketOptions } from 'lnmessage/dist/types.js'
import type {
  ListAccountEventsResponse,
  ListForwardsResponse,
  ListTransactionsResponse,
  ListfundsResponse,
  Pay,
  RawInvoice,
  SocketWrapper
} from './types.js'
import type { Invoice } from '$lib/@types/invoices.js'
import type { Forward } from '$lib/@types/forwards.js'
import type { Network } from '$lib/@types/common.js'
import type { Transaction } from '$lib/@types/transactions.js'
import type { Channel } from '$lib/@types/channels.js'
import type { Utxo } from '$lib/@types/utxos.js'

export const coreLnWorker = new CoreLnWorker()
const messages$ = fromEvent<MessageEvent>(coreLnWorker, 'message')

export const createSocket = async (
  connectioOptions: LnWebSocketOptions,
  connectionStatusUpdates$: BehaviorSubject<ConnectionStatus>
): Promise<SocketWrapper> => {
  const id = createRandomHex()
  const initProm = firstValueFrom(messages$.pipe(filter(message => message.data.id === id)))
  coreLnWorker.postMessage({ id, type: 'init', data: connectioOptions })

  await initProm

  messages$
    .pipe(
      filter(message => message.data.id === 'connectionStatus$'),
      map(({ data }) => data.result)
    )
    .subscribe(status => connectionStatusUpdates$.next(status as ConnectionStatus))

  const socket = {
    connect: async () => {
      const id = createRandomHex()
      coreLnWorker.postMessage({ id, type: 'connect' })

      return firstValueFrom(
        messages$.pipe(
          filter(message => message.data.id === id),
          map(message => message.data.result as boolean)
        )
      )
    },
    disconnect: async () => {
      const id = createRandomHex()
      coreLnWorker.postMessage({ id, type: 'disconnect' })

      return firstValueFrom(
        messages$.pipe(
          filter(message => message.data.id === id),
          map(() => undefined)
        )
      )
    },
    commando: async (request: CommandoRequest) => {
      const id = createRandomHex()
      coreLnWorker.postMessage({ id, type: 'commando', data: request })

      return firstValueFrom(
        messages$.pipe(
          filter(message => message.data.id === id),
          map(message => {
            if (message.data.error) {
              throw message.data.error
            }

            return message.data.result
          })
        )
      )
    }
  }

  return socket
}

export const formatPayments = async (
  invoices: RawInvoice[],
  pays: Pay[],
  walletId: string
): Promise<Invoice[]> => {
  const id = createRandomHex()

  coreLnWorker.postMessage({ id, type: 'format_payments', invoices, pays, walletId })

  return firstValueFrom(
    messages$.pipe(
      filter(message => message.data.id === id),
      map(message => message.data.result as Invoice[])
    )
  )
}

export const formatForwards = async (
  forwards: ListForwardsResponse['forwards'],
  walletId: string
): Promise<Forward[]> => {
  const id = createRandomHex()

  coreLnWorker.postMessage({ id, type: 'format_forwards', forwards, walletId })

  return firstValueFrom(
    messages$.pipe(
      filter(message => message.data.id === id),
      map(message => message.data.result as Forward[])
    )
  )
}

export const formatTransactions = async (
  transactions: ListTransactionsResponse['transactions'],
  accountEvents: ListAccountEventsResponse | null,
  network: Network,
  walletId: string
): Promise<Transaction[]> => {
  const id = createRandomHex()

  coreLnWorker.postMessage({
    id,
    type: 'format_transactions',
    transactions,
    accountEvents,
    network,
    walletId
  })

  return firstValueFrom(
    messages$.pipe(
      filter(message => message.data.id === id),
      map(message => {
        if (message.data.error) {
          throw message.data.error
        }

        return message.data.result as Transaction[]
      })
    )
  )
}

export const getChannels = async (
  rune: string,
  version: number,
  walletId: string,
  channel?: { id: string; peerId: string }
): Promise<Channel[]> => {
  const id = createRandomHex()

  coreLnWorker.postMessage({
    id,
    type: 'get_channels',
    rune,
    version,
    walletId,
    channel
  })

  return firstValueFrom(
    messages$.pipe(
      filter(message => message.data.id === id),
      map(message => {
        if (message.data.error) {
          throw message.data.error
        }

        return message.data.result as Channel[]
      })
    )
  )
}

export const formatUtxos = async (
  outputs: ListfundsResponse['outputs'],
  accountEvents: ListAccountEventsResponse | null,
  walletId: string
): Promise<Utxo[]> => {
  const id = createRandomHex()

  coreLnWorker.postMessage({
    id,
    type: 'format_utxos',
    outputs,
    accountEvents,
    walletId
  })

  return firstValueFrom(
    messages$.pipe(
      filter(message => message.data.id === id),
      map(message => {
        if (message.data.error) {
          throw message.data.error
        }

        return message.data.result as Utxo[]
      })
    )
  )
}