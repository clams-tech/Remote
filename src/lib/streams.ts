import { BehaviorSubject, from, fromEvent, of, timer } from 'rxjs'
import { catchError, map, shareReplay, startWith, switchMap } from 'rxjs/operators'
import { MIN_IN_MS, SETTINGS_STORAGE_KEY } from './constants'
import { Modals, type BitcoinExchangeRates, type Payment, type Settings } from './types'
import type { CoreLnCredentials } from './backends'

import {
	getBitcoinExchangeRate,
	getPageVisibilityParams,
	getSettings,
	SvelteSubject
} from './utils'

export const credentials$ = new SvelteSubject<CoreLnCredentials | null>(null)
export const lastPath$ = new BehaviorSubject('/')
export const settings$ = new BehaviorSubject<Settings>(getSettings())
export const bitcoinExchangeRates$ = new BehaviorSubject<BitcoinExchangeRates | null>(null)
export const modal$ = new BehaviorSubject<Modals>(Modals.none)

export const payments$ = new BehaviorSubject<Payment[]>([])

const pageVisibilityParams = getPageVisibilityParams()

export const appVisible$ = fromEvent(document, pageVisibilityParams.visibilityChange).pipe(
	map(() => !document[pageVisibilityParams.hidden as keyof Document]),
	startWith(true),
	shareReplay(1)
)

// update settings in storage
settings$.subscribe((update) => localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(update)))

// get and update bitcoin exchange rate
timer(0, 1 * MIN_IN_MS)
	.pipe(
		switchMap(() => from(getBitcoinExchangeRate())),
		catchError(() => of({ bitcoin: null })),
		map(({ bitcoin }) => bitcoin)
	)
	.subscribe(bitcoinExchangeRates$)
