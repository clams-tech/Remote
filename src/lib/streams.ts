import {
  BehaviorSubject,
  defer,
  Observable,
  ReplaySubject,
  scan,
  shareReplay,
  startWith,
  Subject,
  take
} from 'rxjs'
import { onDestroy } from 'svelte'
import type { Invoice } from './@types/invoices.js'
import type { Session } from './@types/session.js'
import type { BitcoinExchangeRates, Settings } from './@types/settings.js'
import { DEFAULT_SETTINGS } from './constants.js'
import { getDataFromStorage, storageKeys } from './storage.js'
import { SvelteSubject } from './utils.js'

export const session$ = new BehaviorSubject<Session | null>(null)

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

// debug logs
export const log$ = new Subject<string>()

// current bitcoin exchange rates
export const bitcoinExchangeRates$ = new BehaviorSubject<BitcoinExchangeRates | null>(null)

// all payment update events
export const paymentUpdates$ = new Subject<Invoice>()

const storedSettings = getDataFromStorage(storageKeys.settings)

// app settings
export const settings$ = new SvelteSubject<Settings>({
  ...DEFAULT_SETTINGS,
  ...(storedSettings ? JSON.parse(storedSettings) : {})
})

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

// for all custom notifications such as errors and hints
export const customNotifications$ = new ReplaySubject<Notification>(10, 10000)
