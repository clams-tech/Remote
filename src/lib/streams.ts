import { BehaviorSubject, defer, fromEvent, Observable, of, ReplaySubject, Subject } from 'rxjs'
import { map, scan, shareReplay, startWith, take } from 'rxjs/operators'
import { onDestroy, onMount } from 'svelte'
import type { BkprListIncomeResponse, GetinfoResponse, ListfundsResponse } from './backends'
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from './constants'
import type { BitcoinExchangeRates, Notification, Payment, Auth, Settings } from './types'
import { logger } from './utils'

// Makes a BehaviourSubject compatible with Svelte stores
export class SvelteSubject<T> extends BehaviorSubject<T> {
  set: BehaviorSubject<T>['next']
  constructor(initialState: T) {
    super(initialState)
    this.set = super.next
  }
}

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

let storedSettings: null | string = null

if (typeof window !== 'undefined') {
  try {
    storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY)
  } catch (error) {
    logger.error('Could not retrieve settings, access to local storage denied')
  }
}

// app settings$
export const settings$ = new SvelteSubject<Settings>(
  storedSettings ? JSON.parse(storedSettings) : DEFAULT_SETTINGS
)

// current bitcoin exchange rates
export const bitcoinExchangeRates$ = new BehaviorSubject<BitcoinExchangeRates | null>(null)

// all payment update events
export const paymentUpdates$ = new Subject<Payment>()

// core ln credentials
export const auth$ = new BehaviorSubject<Auth | null>(null)

// key for decrypting stored data
export const pin$ = new BehaviorSubject<string | null>(null)

// debug logs
export const log$ = new Subject<string>()

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

// ==== NODE DATA ==== //
export const nodeInfo$ = new BehaviorSubject<{
  data: GetinfoResponse | null
  loading?: boolean
  error?: string
}>({ loading: true, data: null })

export const payments$ = new BehaviorSubject<{
  data: Payment[] | null
  loading?: boolean
  error?: string
}>({ loading: true, data: null })

export const funds$ = new BehaviorSubject<{
  data: ListfundsResponse | null
  loading?: boolean
  error?: string
}>({ loading: true, data: null })

export const incomeEvents$ = new BehaviorSubject<{
  data: BkprListIncomeResponse | null
  loading?: boolean
  error?: string
}>({ loading: true, data: null })

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

export function updatePayments(payment: Payment): void {
  const payments = payments$.getValue().data || []
  const paymentIndex = payments.findIndex(({ hash }) => hash === payment.hash)

  if (paymentIndex !== -1) {
    // if exists, the replace with update
    payments[paymentIndex] = payment
  } else {
    // otherwise put in the front of payments list
    payments.unshift(payment)
  }

  payments$.next({ data: payments })
}

export function updateAuth(update: Partial<Auth> | Auth): void {
  const currentAuth = auth$.getValue()
  auth$.next(currentAuth ? { ...currentAuth, ...update } : (update as Auth))
}
