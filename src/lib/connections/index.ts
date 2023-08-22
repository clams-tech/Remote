import type { ConnectionDetails, CoreLnConfiguration } from '$lib/@types/connections.js'
import type { AppError } from '$lib/@types/errors.js'
import type { Session } from '$lib/@types/session.js'
import { WS_PROXY } from '$lib/constants.js'
import { db } from '$lib/db.js'
import { nowSeconds, stripUndefined, wait } from '$lib/utils.js'
import { Subject, type Observable, takeUntil, filter, take } from 'rxjs'
import CoreLightning from './coreln/index.js'
import coreLnLogo from './coreln/logo.js'
import type { ConnectionInterface } from './interfaces.js'
import type { Invoice } from '$lib/@types/invoices.js'
import { decryptWithAES } from '$lib/crypto.js'
import { connections$, errors$, session$ } from '$lib/streams.js'
// import { log } from '$lib/services.js'

export const connectionOptions: { type: ConnectionDetails['type']; icon: string }[] = [
  {
    type: 'coreln',
    icon: coreLnLogo
  }
]

export const connectionDetailsToInterface = (
  info: ConnectionDetails,
  session: Session
): ConnectionInterface => {
  switch (info.type) {
    case 'coreln':
      return new CoreLightning(
        info.id,
        info.configuration as CoreLnConfiguration,
        session
        // log
      )
  }

  throw new Error(`Invalid connection type: ${info.type}`)
}

export const connectionTypeToInitialConfiguration = (
  type: ConnectionDetails['type']
): ConnectionDetails['configuration'] => {
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

export const listenForConnectionErrors = (connection: ConnectionInterface) => {
  connection.errors$.pipe(takeUntil(connection.destroy$)).subscribe(errors$)
}

/** decrypts auth token if exists and then returns a connection interface */
export const getConnectionInterface = (
  connectionDetails: ConnectionDetails
): ConnectionInterface => {
  const { configuration } = connectionDetails
  const { token } = configuration as CoreLnConfiguration
  const session = session$.value as Session

  /** decrypt stored token*/
  if (token) {
    ;(configuration as CoreLnConfiguration).token = decryptWithAES(token, session.secret)
  }

  const decryptedConnectionDetails = {
    ...connectionDetails,
    ...(configuration ? { configuration } : {})
  }

  return connectionDetailsToInterface(decryptedConnectionDetails, session)
}

export const connect = async (
  connectionDetails: ConnectionDetails
): Promise<ConnectionInterface> => {
  const currentConnections = connections$.value

  // lookup if connection exists
  let connection: ConnectionInterface = currentConnections.find(
    (conn) => conn.connectionId === connectionDetails.id
  ) as ConnectionInterface

  // if not create one
  if (!connection) {
    connection = getConnectionInterface(connectionDetails)
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
  connection: ConnectionInterface,
  lastSync: number | null
): Observable<number> => {
  db.connections.update(connection.connectionId, { syncing: true })
  // queue of requests to make
  const requestQueue = []

  // progress percent
  const progress$ = new Subject<number>()

  const invoicesRequest = async () =>
    connection.invoices
      ? connection.invoices.get().then((invoices) => {
          return Promise.all(
            invoices.map((invoice) =>
              db.invoices
                .update(invoice.id, stripUndefined(invoice))
                .then((updated) => !updated && db.invoices.add(invoice))
            )
          )
        })
      : Promise.resolve()

  requestQueue.push(invoicesRequest)

  const utxosRequest = () =>
    connection.utxos
      ? connection.utxos.get().then((utxos) => {
          return Promise.all(
            utxos.map((utxo) =>
              db.utxos
                .update(utxo.id, stripUndefined(utxo))
                .then((updated) => !updated && db.utxos.add(utxo))
            )
          )
        })
      : Promise.resolve()

  requestQueue.push(utxosRequest)

  const channelsRequest = () =>
    connection.channels
      ? connection.channels.get().then((channels) => {
          return Promise.all(
            channels.map((channel) =>
              db.channels
                .update(channel.id, stripUndefined(channel))
                .then((updated) => !updated && db.channels.add(channel))
            )
          )
        })
      : Promise.resolve()

  requestQueue.push(channelsRequest)

  const transactionsRequest = () =>
    connection.transactions
      ? connection.transactions.get().then((transactions) => {
          return Promise.all(
            transactions.map((transaction) =>
              db.transactions
                .update(transaction.id, stripUndefined(transaction))
                .then((updated) => !updated && db.transactions.add(transaction))
            )
          )
        })
      : Promise.resolve()

  requestQueue.push(transactionsRequest)

  const forwardsRequest = () =>
    connection.forwards
      ? connection.forwards.get().then((forwards) => {
          return Promise.all(
            forwards.map((forward) =>
              db.forwards
                .update(forward.id, stripUndefined(forward))
                .then((updated) => !updated && db.forwards.add(forward))
            )
          )
        })
      : Promise.resolve()

  requestQueue.push(forwardsRequest)

  const offersRequest = () =>
    connection.offers
      ? connection.offers.get().then((offers) => {
          return Promise.all(
            offers.map((offer) =>
              db.offers
                .update(offer.id, stripUndefined(offer))
                .then((updated) => !updated && db.offers.add(offer))
            )
          )
        })
      : Promise.resolve()

  requestQueue.push(offersRequest)

  if (connection.invoices && connection.invoices.listenForAnyInvoicePayment) {
    const updateInvoice = (invoice: Invoice) =>
      db.invoices
        .update(invoice.id, stripUndefined(invoice))
        .then((updated) => !updated && db.invoices.add(invoice))

    db.invoices
      .where('connectionId')
      .equals(connection.connectionId)
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
      db.connections.update(connection.connectionId, { syncing: false, lastSync: nowSeconds() })
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
