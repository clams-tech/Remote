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
import { db } from '$lib/db.js'
import { log } from '$lib/services.js'

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

  if (connection.info.id) {
    await db.wallets.update(wallet.id, { nodeId: connection.info.id })
  }

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
      ? connection.invoices
          .get()
          .then((invoices) => db.invoices.bulkPut(invoices))
          .catch((error) => log.error(error.detail.message))
      : Promise.resolve()

  requestQueue.push(invoicesRequest)

  const utxosRequest = () =>
    connection.utxos
      ? connection.utxos
          .get()
          .then((utxos) => db.utxos.bulkPut(utxos))
          .catch((error) => log.error(error.detail.message))
      : Promise.resolve()

  requestQueue.push(utxosRequest)

  const channelsRequest = () =>
    connection.channels
      ? connection.channels
          .get()
          .then((channels) =>
            channels.map((channel) =>
              // need to update channels as old channels lose data after 100 blocks of being close
              // so we don't want to overwrite data we already have as it is useful
              db.channels
                .update(channel.id, channel)
                .then((updated) => !updated && db.channels.add(channel))
            )
          )
          .catch((error) => log.error(error.detail.message))
      : Promise.resolve()

  requestQueue.push(channelsRequest)

  const transactionsRequest = () =>
    connection.transactions
      ? connection.transactions
          .get()
          .then((transactions) => db.transactions.bulkPut(transactions))
          .catch((error) => log.error(error.detail.message))
      : Promise.resolve()

  requestQueue.push(transactionsRequest)

  const forwardsRequest = () =>
    connection.forwards
      ? connection.forwards
          .get()
          .then((forwards) => db.forwards.bulkPut(forwards))
          .catch((error) => log.error(error.detail.message))
      : Promise.resolve()

  requestQueue.push(forwardsRequest)

  const offersRequest = () =>
    connection.offers
      ? connection.offers
          .get()
          .then((offers) => db.offers.bulkPut(offers))
          .catch((error) => log.error(error.detail.message))
      : Promise.resolve()

  requestQueue.push(offersRequest)

  const tradesRequest = () =>
    connection.trades
      ? connection.trades
          .get()
          .then((trades) => db.trades.bulkPut(trades))
          .catch((error) => log.error(error.detail.message))
      : Promise.resolve()

  requestQueue.push(tradesRequest)

  const withdrawalsRequest = () =>
    connection.withdrawals
      ? connection.withdrawals
          .get()
          .then((withdrawals) => db.withdrawals.bulkPut(withdrawals))
          .catch((error) => log.error(error.detail.message))
      : Promise.resolve()

  requestQueue.push(withdrawalsRequest)

  const depositsRequest = () =>
    connection.deposits
      ? connection.deposits
          .get()
          .then((deposits) => db.deposits.bulkPut(deposits))
          .catch((error) => log.error(error.detail.message))
      : Promise.resolve()

  requestQueue.push(depositsRequest)

  /** process request queue
   * then listen for invoice updates
   */
  processQueue(requestQueue, progress$).then(() => {
    if (connection.invoices && connection.invoices.listenForAnyInvoicePayment) {
      db.invoices
        .where('walletId')
        .equals(connection.walletId)
        .reverse()
        .sortBy('payIndex')
        .then(([lastPayedInvoice]) => {
          if (connection.invoices && connection.invoices.listenForAnyInvoicePayment) {
            connection.invoices
              .listenForAnyInvoicePayment(
                (invoice) => db.invoices.put(invoice),
                lastPayedInvoice?.payIndex
              )
              .catch((error) => log.error(error.detail.message))
          }
        })
    }
  })

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
