import { liveQuery } from 'dexie'
import { db, getConnection, getLastPaymentIndex, updatePayment } from './db'
import { getBitcoinExchangeRate, logger } from './utils'
import lightning from './lightning.js'
import { onDestroy, onMount } from 'svelte'
import { MIN_IN_MS } from './constants'
import type { BitcoinExchangeRates } from './@types/settings.js'
import type { Notification } from './@types/ui.js'
import type { Payment } from './@types/payments.js'

import {
  BehaviorSubject,
  defer,
  from,
  fromEvent,
  merge,
  Observable,
  of,
  ReplaySubject,
  Subject,
  timer
} from 'rxjs'

import {
  distinctUntilChanged,
  map,
  scan,
  shareReplay,
  skip,
  startWith,
  switchMap,
  take
} from 'rxjs/operators'

// when svelte component is mounted
export const onMount$ = defer(() => {
  const subject = new Subject<void>()
  onMount(() => {
    subject.next()
  })
  return subject.asObservable().pipe(take(1))
})

// when svelte component is destroyed
export const onDestroy$ = defer(() => {
  const subject = new Subject<void>()
  onDestroy(() => {
    subject.next()
  })
  return subject.asObservable().pipe(take(1))
})

// the last url path
export const lastPath$ = new BehaviorSubject('/')

// current bitcoin exchange rates
export const bitcoinExchangeRates$ = new BehaviorSubject<BitcoinExchangeRates | null>(null)

// all payment update events
export const paymentUpdates$ = new Subject<Payment>()

// key for decrypting stored data
export const passphrase$ = new BehaviorSubject<string | null>(null)

// debug logs
export const log$ = new Subject<string>()

export const loading$ = new BehaviorSubject<boolean>(false)

// log to console in staging
if (import.meta.env.MODE === 'staging' || import.meta.env.DEV) {
  log$.subscribe(console.log)
}

// disconnect from node event
export const disconnect$ = new Subject<void>()

export const recentLogs$: Observable<string[]> = log$.pipe(
  scan((allLogs, newLog) => {
    if (newLog === 'CLEAR_ALL_LOGS') return []

    allLogs.push(newLog)

    while (allLogs.length > 50) {
      allLogs.shift()
    }

    return allLogs
  }, [] as string[]),
  shareReplay(1),
  startWith([])
)

// subscribe to ensure that we start collecting logs
recentLogs$.subscribe()

// browsers use different event names and hidden properties
const pageVisibilityParams =
  typeof window === 'undefined'
    ? {
        hidden: 'hidden',
        visibilityChange: 'visibilitychange'
      }
    : typeof document.hidden !== 'undefined'
    ? {
        hidden: 'hidden',
        visibilityChange: 'visibilitychange'
      }
    : // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    typeof document.msHidden !== 'undefined'
    ? {
        hidden: 'msHidden',
        visibilityChange: 'msvisibilitychange'
      }
    : {
        hidden: 'webkitHidden',
        visibilityChange: 'webkitvisibilitychange'
      }

// indicates if the app is the current tab
export const appVisible$ =
  typeof window === 'undefined'
    ? of(true)
    : fromEvent(document, pageVisibilityParams.visibilityChange).pipe(
        map(() => !document[pageVisibilityParams.hidden as keyof Document]),
        startWith(true),
        shareReplay(1)
      )

// indicates if we are already listening for invoice updates
export const listeningForAllInvoiceUpdates$ = new BehaviorSubject<boolean>(false)

// for all custom notifications such as errors and hints
export const customNotifications$ = new ReplaySubject<Notification>(10, 10000)

// update payments when payment update comes through
paymentUpdates$.subscribe(async (update) => {
  try {
    await updatePayment(update)
  } catch (error) {
    const [node] = await db.nodes.toArray()
    const { message } = error as { message: string }

    db.errors.add({
      message,
      context: 'Trying to update payments in DB',
      timestamp: Date.now(),
      nodeId: node.id
    })
  }
  // @TODO - Is there a smart way to update balance without fetching from the node??
  // if (update.status === 'complete') {
  //   // delay 1 second to allow for updated data from node
  //   setTimeout(() => lightning.updateFunds(), 1000)
  // }
})

const exchangeRatePoll$ = timer(0, 5 * MIN_IN_MS)

const fiatDenominationChange$ = from(
  liveQuery(async () => {
    const [settings] = await db.settings.toArray()
    return settings.fiatDenomination
  })
).pipe(distinctUntilChanged())

// get and update bitcoin exchange rate by poll or if fiat denomination changes
merge(exchangeRatePoll$, fiatDenominationChange$)
  .pipe(switchMap(() => from(getBitcoinExchangeRate())))
  .subscribe(bitcoinExchangeRates$)

// manage connection based on app visibility
appVisible$.pipe(skip(1), distinctUntilChanged()).subscribe(async (visible) => {
  const connection = await getConnection()

  if (!connection || !connection.token) return

  const lnApi = lightning.ln

  if (visible) {
    logger.info('App is visible, reconnecting to node')

    // reconnect
    lnApi.connect()

    const lastPayIndex = await getLastPaymentIndex()

    // start listening for payment updates again
    lightning.listenForAllInvoiceUpdates(lastPayIndex)
  } else {
    logger.info(
      'App is hidden, disconnecting from node and cancelling listening for any invoice updates'
    )
    // disconnect
    lnApi.disconnect()
    disconnect$.next()
  }
})
