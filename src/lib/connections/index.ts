import type { ConnectionDetails, CoreLnConfiguration } from '$lib/@types/connections.js'
import type { AppError } from '$lib/@types/errors.js'
import type { Session } from '$lib/@types/session.js'
import { WS_PROXY } from '$lib/constants.js'
import { db } from '$lib/db.js'
import { nowSeconds, wait } from '$lib/utils.js'
import { Subject, type Observable, takeUntil, filter, take } from 'rxjs'
import CoreLightning from './coreln/index.js'
import coreLnLogo from './coreln/logo.js'
import type { ConnectionInterface } from './interfaces.js'
import type { Invoice } from '$lib/@types/invoices.js'
import { decryptWithAES } from '$lib/crypto.js'
import { connections$, errors$, session$ } from '$lib/streams.js'

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
      return new CoreLightning(info.id, info.configuration as CoreLnConfiguration, session)
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
          db.invoices.bulkPut(invoices)
        })
      : Promise.resolve()

  requestQueue.push(invoicesRequest)

  const utxosRequest = () =>
    connection.utxos
      ? connection.utxos.get().then((utxos) => {
          db.utxos.bulkPut(utxos)
        })
      : Promise.resolve()

  requestQueue.push(utxosRequest)

  const channelsRequest = () =>
    connection.channels
      ? connection.channels.get().then((channels) => {
          db.channels.bulkPut(channels)
        })
      : Promise.resolve()

  requestQueue.push(channelsRequest)

  const transactionsRequest = () =>
    connection.transactions
      ? connection.transactions.get().then((transactions) => {
          db.transactions.bulkPut(transactions)
        })
      : Promise.resolve()

  requestQueue.push(transactionsRequest)

  const forwardsRequest = () =>
    connection.forwards
      ? connection.forwards.get().then((forwards) => {
          db.forwards.bulkPut(forwards)
        })
      : Promise.resolve()

  requestQueue.push(forwardsRequest)

  const offersRequest = () =>
    connection.offers
      ? connection.offers.get().then((offers) => {
          db.offers.bulkPut(offers)
        })
      : Promise.resolve()

  requestQueue.push(offersRequest)

  if (connection.invoices && connection.invoices.listenForAnyInvoicePayment) {
    const updateInvoice = (invoice: Invoice) => db.invoices.put(invoice)

    db.invoices
      .where('connectionId')
      .equals(connection.connectionId)
      .toArray()
      .then((connectionInvoices) => {
        const [lastPayedInvoice] = connectionInvoices.sort(
          (a, b) => (b?.payIndex || 0) - (a?.payIndex || 0)
        )

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
