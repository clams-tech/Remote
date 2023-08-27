import type { Wallet, CoreLnConfiguration } from '$lib/@types/wallets.js'
import type { AppError } from '$lib/@types/errors.js'
import type { Session } from '$lib/@types/session.js'
import { WS_PROXY } from '$lib/constants.js'
import { nowSeconds, wait } from '$lib/utils.js'
import { Subject, type Observable, takeUntil, filter, take } from 'rxjs'
import CoreLightning from './coreln/index.js'
import coreLnLogo from './coreln/logo.js'
import type { Connection } from './interfaces.js'
import { decryptWithAES } from '$lib/crypto.js'
import { connections$, errors$, session$ } from '$lib/streams.js'

import {
  db,
  updateChannel,
  updateForward,
  updateInvoice,
  updateOffer,
  updateTransaction,
  updateUtxo
} from '$lib/db.js'
// import { log } from '$lib/services.js'

export const connectionOptions: { type: Wallet['type']; icon: string }[] = [
  {
    type: 'coreln',
    icon: coreLnLogo
  }
]

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

  throw new Error(`Invalid wallet type: ${wallet.type}`)
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

export const listenForConnectionErrors = (connection: Connection) => {
  connection.errors$.pipe(takeUntil(connection.destroy$)).subscribe(errors$)
}

/** decrypts auth token if exists and then returns a connection interface */
export const getConnection = (connectionDetails: Wallet): Connection => {
  const { configuration } = connectionDetails
  const { token } = configuration as CoreLnConfiguration
  const session = session$.value as Session

  /** decrypt stored token*/
  if (token) {
    ;(configuration as CoreLnConfiguration).token = decryptWithAES(token, session.secret)
  }

  const decryptedWalletDetails = {
    ...connectionDetails,
    ...(configuration ? { configuration } : {})
  }

  return walletToConnection(decryptedWalletDetails, session)
}

export const connect = async (wallet: Wallet): Promise<Connection> => {
  const currentConnections = connections$.value

  // lookup if connection exists
  let connection: Connection = currentConnections.find(
    (conn) => conn.walletId === wallet.id
  ) as Connection

  // if not create one
  if (!connection) {
    connection = getConnection(wallet)
    connections$.next([...currentConnections, connection])
  }

  connection.connect && (await connection.connect())
  listenForConnectionErrors(connection)

  return connection
}

/** lastSync unix timestamp seconds to be used in future pass to get methods to get update
 * since last sync
 */
export const syncConnectionData = (
  connection: Connection,
  lastSync: number | null
): Observable<number> => {
  db.wallets.update(connection.walletId, { syncing: true })
  // queue of requests to make
  const requestQueue = []

  // progress percent
  const progress$ = new Subject<number>()

  const invoicesRequest = async () =>
    connection.invoices
      ? connection.invoices.get().then((invoices) => Promise.all(invoices.map(updateInvoice)))
      : Promise.resolve()

  requestQueue.push(invoicesRequest)

  const utxosRequest = () =>
    connection.utxos
      ? connection.utxos.get().then((utxos) => Promise.all(utxos.map(updateUtxo)))
      : Promise.resolve()

  requestQueue.push(utxosRequest)

  const channelsRequest = () =>
    connection.channels
      ? connection.channels.get().then((channels) => Promise.all(channels.map(updateChannel)))
      : Promise.resolve()

  requestQueue.push(channelsRequest)

  const transactionsRequest = () =>
    connection.transactions
      ? connection.transactions
          .get()
          .then((transactions) => Promise.all(transactions.map(updateTransaction)))
      : Promise.resolve()

  requestQueue.push(transactionsRequest)

  const forwardsRequest = () =>
    connection.forwards
      ? connection.forwards.get().then((forwards) => Promise.all(forwards.map(updateForward)))
      : Promise.resolve()

  requestQueue.push(forwardsRequest)

  const offersRequest = () =>
    connection.offers
      ? connection.offers.get().then((offers) => Promise.all(offers.map(updateOffer)))
      : Promise.resolve()

  requestQueue.push(offersRequest)

  if (connection.invoices && connection.invoices.listenForAnyInvoicePayment) {
    db.invoices
      .where('walletId')
      .equals(connection.walletId)
      .reverse()
      .sortBy('payIndex')
      .then(([lastPayedInvoice]) => {
        if (connection.invoices && connection.invoices.listenForAnyInvoicePayment) {
          connection.invoices.listenForAnyInvoicePayment(updateInvoice, lastPayedInvoice?.payIndex)
        }
      })
  }

  processQueue(requestQueue, progress$)

  progress$
    .pipe(
      filter((p) => p === 100),
      take(1)
    )
    .subscribe(() => {
      db.wallets.update(connection.walletId, { syncing: false, lastSync: nowSeconds() })
    })

  return progress$.asObservable()
}

type Request = () => Promise<void | void[]>

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
