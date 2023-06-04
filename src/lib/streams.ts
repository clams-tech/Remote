import { onDestroy } from 'svelte'
import type { Invoice } from './@types/invoices.js'
import type { Session } from './@types/session.js'
import type { BitcoinExchangeRates, Settings } from './@types/settings.js'
import type { Notification } from './@types/util.js'
import { DEFAULT_SETTINGS } from './constants.js'
import { getDataFromStorage, STORAGE_KEYS, writeDataToStorage } from './storage.js'
import { logger, SvelteSubject } from './utils.js'
import { liveQuery } from 'dexie'
import { db } from './db.js'

import {
  BehaviorSubject,
  defer,
  filter,
  from,
  Observable,
  ReplaySubject,
  scan,
  shareReplay,
  startWith,
  Subject,
  take
} from 'rxjs'

export const connections$ = from(liveQuery(() => db.connections.toArray())).pipe(
  startWith([]),
  shareReplay(1)
)

export const session$ = new BehaviorSubject<Session | null>(null)
export const checkedSession$ = new BehaviorSubject<boolean>(false)

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

const storedSettings = getDataFromStorage(STORAGE_KEYS.settings)

// app settings
export const settings$ = new SvelteSubject<Settings>({
  ...DEFAULT_SETTINGS,
  ...(storedSettings ? JSON.parse(storedSettings) : {})
})

// updates settings in storage and handles dark mode toggle
settings$.pipe(filter((x) => !!x)).subscribe((update) => {
  try {
    document.documentElement.classList[update.darkmode ? 'add' : 'remove']('dark')
    writeDataToStorage(STORAGE_KEYS.settings, JSON.stringify(update))
  } catch (error) {
    logger.error('Could not save settings to storage, access to local storage denied')
  }
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
