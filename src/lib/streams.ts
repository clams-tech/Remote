import { onDestroy } from 'svelte'
import type { Session } from './@types/session.js'
import type { BitcoinExchangeRates, Settings } from './@types/settings.js'
import { DEFAULT_SETTINGS, MIN_IN_MS, STORAGE_KEYS } from './constants.js'
import type { Connection } from './wallets/interfaces.js'
import type { AppError } from './@types/errors.js'
import type { AutoConnectWalletOptions, Wallet } from './@types/wallets.js'
import { SvelteSubject } from './svelte.js'
import { log, storage } from './services.js'
import { getBitcoinExchangeRate } from './utils.js'
import { liveQuery } from 'dexie'
import { db } from './db/index.js'
import { browser } from '$app/environment'

import {
  BehaviorSubject,
  defer,
  filter,
  from,
  type Observable,
  scan,
  shareReplay,
  skip,
  Subject,
  take,
  timer,
  distinctUntilKeyChanged,
  merge,
  switchMap
} from 'rxjs'
import { mergeDefaultsWithStoredSettings } from './settings.js'

export const session$ = new BehaviorSubject<Session | null>(null)
export const autoConnectWallet$ = new BehaviorSubject<AutoConnectWalletOptions | null>(null)
export const larpMode$ = new BehaviorSubject<boolean>(false)
export const checkedSession$ = new BehaviorSubject<boolean>(false)
export const errors$ = new Subject<AppError>()
export const connections$ = new BehaviorSubject<Connection[]>([])
export const wallets$ = new BehaviorSubject<Wallet[]>([])

if (browser) {
  from(liveQuery(() => db.wallets.toArray())).subscribe(wallets => wallets$.next(wallets))
}

type ConnectionErrors = Record<Wallet['id'], AppError[]>

/** A collection of the last 10 errors for each walletId */
export const connectionErrors$: Observable<ConnectionErrors> = errors$.pipe(
  filter(error => error.key?.startsWith('connection_')),
  scan((acc, value) => {
    const { walletId } = value.detail

    if (!walletId) {
      log.warn(`Connection error that does not have a wallet id: ${JSON.stringify(value)}`)
      return acc
    }

    if (!acc[walletId]) {
      acc[walletId] = []
    }

    const errors = acc[walletId]
    errors.push(value)

    /** keep the last 10 errors only, truncate if longer */
    errors.length = Math.min(errors.length, 10)

    return acc
  }, {} as ConnectionErrors),
  shareReplay(1)
)

// when svelte component is destroyed
export const onDestroy$ = defer(() => {
  const subject = new Subject<void>()
  onDestroy(() => {
    subject.next()
  })
  return subject.asObservable().pipe(take(1))
})

// current bitcoin exchange rates
export const bitcoinExchangeRates$ = new BehaviorSubject<BitcoinExchangeRates | null>(null)

const storedSettings = typeof window !== 'undefined' ? storage.get(STORAGE_KEYS.settings) : null

// app settings
export const settings$ = new SvelteSubject<Settings>(
  mergeDefaultsWithStoredSettings(DEFAULT_SETTINGS, storedSettings)
)

// updates settings in storage on change
settings$
  .pipe(
    skip(1),
    filter(x => !!x)
  )
  .subscribe(update => {
    try {
      storage.write(STORAGE_KEYS.settings, JSON.stringify(update))
    } catch (error) {
      log.error('Access to local storage is blocked. Could not write settings to storage')
    }
  })

const exchangeRatePoll$ = timer(0, 5 * MIN_IN_MS)

const fiatDenominationChange$ = settings$.pipe(distinctUntilKeyChanged('fiatDenomination'), skip(1))

// get and update bitcoin exchange rate by poll or if fiat denomination changes
merge(exchangeRatePoll$, fiatDenominationChange$)
  .pipe(
    switchMap(() => from(getBitcoinExchangeRate(settings$.value.fiatDenomination))),
    filter(x => !!x)
  )
  .subscribe(bitcoinExchangeRates$)
