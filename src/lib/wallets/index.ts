import type { Wallet, CoreLnConfiguration } from '$lib/@types/wallets.js'
import type { AppError } from '$lib/@types/errors.js'
import type { Session } from '$lib/@types/session.js'
import { WS_PROXY } from '$lib/constants.js'
import { nowSeconds, truncateValue, wait } from '$lib/utils.js'
import { Subject, type Observable, takeUntil, filter, take } from 'rxjs'
import CoreLightning from './coreln/index.js'
import coreLnLogo from './coreln/logo.js'
import type { Connection } from './interfaces.js'
import { connections$, errors$, session$ } from '$lib/streams.js'
import { db } from '$lib/db/index.js'
import { log, notification } from '$lib/services.js'
import { get } from 'svelte/store'
import { translate } from '$lib/i18n/translations.js'
import { createRandomHex, decryptWithAES } from '$lib/crypto.js'
import { goto } from '$app/navigation'

import {
  updateTableItems,
  getLastPaidInvoice,
  updateChannels,
  updateTransactions,
  updateInvoices,
  updateAddresses
} from '$lib/db/helpers.js'

type ConnectionCategory = 'lightning' | 'onchain' | 'exchange' | 'custodial' | 'custom'

export const walletTypes = [
  'coreln'
  // 'xpub',
  // 'multisig',
  // 'webln',
  // 'nostr-wallet-connect'
] as const

export const connectionOptions: Partial<
  Record<
    ConnectionCategory,
    {
      type: Wallet['type']
      icon: string
    }[]
  >
> = {
  lightning: [
    {
      type: 'coreln',
      icon: coreLnLogo
    }
  ]
}

export const walletToConnection = (wallet: Wallet, session: Session): Connection => {
  switch (wallet.type) {
    case 'coreln':
      return new CoreLightning(
        wallet.id,
        wallet.configuration as CoreLnConfiguration,
        session
        // log
      )
  }
}

export const walletTypeToInitialConfiguration = (type: Wallet['type']): Wallet['configuration'] => {
  switch (type) {
    case 'coreln':
      return {
        address: '',
        connection: {
          type: 'proxy',
          value: WS_PROXY
        },
        token: ''
      }
    default:
      return null
  }
}

export const createWallet = async () => {
  // add new CLN wallet to the db with generic label and random id
  const id = createRandomHex()
  const type = 'coreln'
  const label = type

  await db.wallets.add({
    id,
    label,
    type,
    createdAt: nowSeconds(),
    modifiedAt: null,
    configuration: walletTypeToInitialConfiguration(type),
    lastSync: null,
    syncing: false
  })

  return { id }
}

export const deleteWallet = async (id: Wallet['id']) => {
  await db.wallets.delete(id)

  const connections = connections$.value
  const connectionIndex = connections.findIndex(({ walletId }) => walletId === id)

  if (connectionIndex !== -1) {
    const connection = connections[connectionIndex]

    // disconnect
    connection.disconnect && (await connection.disconnect())

    // remove from connections
    connections.splice(connectionIndex, 1)

    // update connections
    connections$.next(connections)
  }

  await Promise.all(
    db.tables.map(async table => {
      try {
        await table.where('walletId').equals(id).delete()
      } catch (error) {
        // wallet id is not indexed, all good to swallow error here
      }
    })
  )
}

export const listenForConnectionErrors = (connection: Connection) => {
  connection.errors$.pipe(takeUntil(connection.destroy$)).subscribe(errors$)
}

/** decrypts auth token if exists and then returns a connection interface */
export const getConnection = (wallet: Wallet): Connection => {
  const { configuration } = wallet
  const { token } = configuration as CoreLnConfiguration
  const session = session$.value as Session

  /** decrypt stored token*/
  if (token) {
    ;(configuration as CoreLnConfiguration).token = decryptWithAES(token, session.secret)
  }

  const decryptedWalletDetails = {
    ...wallet,
    ...(configuration ? { configuration } : {})
  }

  return walletToConnection(decryptedWalletDetails, session)
}

export const connect = async (wallet: Wallet): Promise<Connection> => {
  console.log('wallet = ', wallet)

  let connection: Connection

  // lookup if connection exists
  const currentConnection: Connection = connections$.value.find(
    conn => conn.walletId === wallet.id
  ) as Connection

  // if not create one
  if (!currentConnection) {
    connection = getConnection(wallet)
  } else {
    connection = currentConnection
  }

  if (!currentConnection) {
    connections$.next([...connections$.value, connection])
  }

  connection.connect && (await connection.connect())

  if (connection.info.id) {
    await db.wallets.update(wallet.id, { nodeId: connection.info.id })
  }

  listenForConnectionErrors(connection)

  return connection
}

export const fetchUtxos = async (connection: Connection) =>
  connection.utxos &&
  connection.utxos
    .get()
    .then(utxos => {
      return updateTableItems('utxos', utxos)
    })
    .catch(error => log.error(error?.detail?.message || error))

export const fetchInvoices = async (connection: Connection) =>
  connection.invoices &&
  connection.invoices
    .get()
    .then(invoices => {
      return updateTableItems('payments', invoices)
    })
    .catch(error => log.error(error?.detail?.message || error))

export const fetchChannels = async (connection: Connection) =>
  connection.channels &&
  connection.channels
    .get()
    .then(channels => {
      return updateChannels(channels)
    })
    .catch(error => log.error(error?.detail?.message || error))

export const fetchTransactions = async (connection: Connection) =>
  connection.transactions &&
  connection.transactions
    .get()
    .then(transactions => {
      return updateTransactions(transactions)
    })
    .catch(error => log.error(error?.detail?.message || error))

export const fetchForwards = async (connection: Connection) =>
  connection.forwards &&
  connection.forwards
    .get()
    .then(forwards => {
      return updateTableItems('forwards', forwards)
    })
    .catch(error => log.error(error?.detail?.message || error))

export const fetchOffers = async (connection: Connection) =>
  connection.offers &&
  connection.offers
    .get()
    .then(offers => {
      return updateTableItems('offers', offers)
    })
    .catch(error => log.error(error?.detail?.message || error))

export const fetchTrades = async (connection: Connection) =>
  connection.trades &&
  connection.trades
    .get()
    .then(async trades => {
      return updateTableItems('trades', trades)
    })
    .catch(error => log.error(error?.detail?.message || error))

export const fetchWithdrawals = async (connection: Connection) =>
  connection.withdrawals &&
  connection.withdrawals
    .get()
    .then(async withdrawals => {
      return updateTableItems('withdrawals', withdrawals)
    })
    .catch(error => log.error(error?.detail?.message || error))

export const fetchDeposits = async (connection: Connection) =>
  connection.deposits &&
  connection.deposits
    .get()
    .then(async deposits => {
      return updateTableItems('deposits', deposits)
    })
    .catch(error => log.error(error?.detail?.message || error))

let lastPaidInvoiceIndexNotification: number

/** lastSync unix timestamp seconds to be used in future pass to get methods to get update
 * since last sync
 */
export const syncConnectionData = (
  connection: Connection,
  lastSync: number | null
): Observable<number> => {
  db.wallets.update(connection.walletId, { syncing: true, nodeId: connection.info?.id || '' })

  // queue of requests to make
  const requestQueue: Array<() => Promise<void>> = []

  // progress percent
  const progress$ = new Subject<number>()

  const utxosRequest = () => fetchUtxos(connection)
  requestQueue.push(utxosRequest)

  const transactionsRequest = () => fetchTransactions(connection)
  requestQueue.push(transactionsRequest)

  const invoicesRequest = () => fetchInvoices(connection)
  requestQueue.push(invoicesRequest)

  const channelsRequest = () => fetchChannels(connection)
  requestQueue.push(channelsRequest)

  const forwardsRequest = () => fetchForwards(connection)
  requestQueue.push(forwardsRequest)

  const offersRequest = () => fetchOffers(connection)
  requestQueue.push(offersRequest)

  const tradesRequest = () => fetchTrades(connection)
  requestQueue.push(tradesRequest)

  const withdrawalsRequest = () => fetchWithdrawals(connection)
  requestQueue.push(withdrawalsRequest)

  const depositsRequest = () => fetchDeposits(connection)
  requestQueue.push(depositsRequest)

  /** process request queue
   * then listen for invoice updates
   */
  processQueue(requestQueue, progress$).then(async () => {
    // update all invoices with fallback and all addresses if associated tx
    await Promise.all([updateInvoices(), updateAddresses()])

    // start listening for invoice updates
    if (connection.invoices && connection.invoices.listenForAnyInvoicePayment) {
      getLastPaidInvoice(connection.walletId).then(lastPaidInvoice => {
        if (connection.invoices && connection.invoices.listenForAnyInvoicePayment) {
          connection.invoices
            .listenForAnyInvoicePayment(async invoice => {
              const {
                data: { amount, request, payIndex },
                walletId
              } = invoice
              const wallet = (await db.wallets.get(walletId)) as Wallet

              if (payIndex && payIndex !== lastPaidInvoiceIndexNotification) {
                notification.create({
                  id: createRandomHex(8),
                  heading: get(translate)('app.labels.received_sats'),
                  message: get(translate)('app.labels.invoice_receive_description', {
                    amount,
                    request: request ? truncateValue(request) : 'keysend',
                    wallet: wallet.label
                  }),
                  onclick: () => goto(`/payments/${invoice.id}?wallet=${invoice.walletId}`)
                })

                lastPaidInvoiceIndexNotification = payIndex
              }

              await db.payments.put(invoice)
            }, lastPaidInvoice?.data.payIndex)
            .catch(error => log.error(error?.detail?.message || error))
        }
      })
    }
  })

  progress$
    .pipe(
      filter(p => p === 100),
      take(1)
    )
    .subscribe(() => {
      db.wallets.update(connection.walletId, { syncing: false, lastSync: nowSeconds() })
    })

  return progress$.asObservable()
}

type Request = () => Promise<void>

const processQueue = async (queue: Request[], progress$: Subject<number>) => {
  // wait before making next request
  let readyForNextRequest = Promise.resolve()

  // start next wait at 500ms, but will double each time
  let nextWait = 500
  const requestsTotalLength = queue.length

  progress$.next(0)

  while (queue.length) {
    await readyForNextRequest

    const req = queue.shift()

    if (req) {
      try {
        await req()
      } catch (error) {
        /** if we get up to 30 seconds wait time due to rate limits,
         * then just give up */
        if (nextWait >= 30000) {
          progress$.next(100)
          break
        }

        const { key } = error as AppError

        /** if rate limited, wait some time and increase next wait time */
        if (key === 'connection_rate_limited') {
          console.log('RATE LIMITED, WAITING:', { nextWait })
          readyForNextRequest = wait(nextWait)
          nextWait = nextWait * 2
          queue.unshift(req)
        }
      } finally {
        const processed = requestsTotalLength - queue.length

        const progressPercent =
          processed > 0 ? Math.round((processed / requestsTotalLength) * 100) : 0

        progress$.next(progressPercent)
      }
    }
  }
}
