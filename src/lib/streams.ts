import { BehaviorSubject, from, fromEvent, of, Subject, timer } from 'rxjs'

import {
	catchError,
	filter,
	map,
	pluck,
	shareReplay,
	startWith,
	switchMap,
	take
} from 'rxjs/operators'

import { MIN_IN_MS, SETTINGS_STORAGE_KEY } from './constants'
import { getBitcoinExchangeRate, getPageVisibilityParams, getSettings } from './utils'
import { Modals, type BitcoinExchangeRates, type Settings } from './types'

export const lastPath$ = new BehaviorSubject('/')
export const settings$ = new BehaviorSubject<Settings>(getSettings())
export const bitcoinExchangeRates$ = new BehaviorSubject<BitcoinExchangeRates>(null)
export const modal$ = new BehaviorSubject<Modals>(Modals.none)

const pageVisibilityParams = getPageVisibilityParams()

export const appVisible$ = fromEvent(document, pageVisibilityParams.visibilityChange).pipe(
	map(() => !document[pageVisibilityParams.hidden]),
	startWith(true),
	shareReplay(1)
)

// update settings in storage
settings$.subscribe((update) => localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(update)))

// get and update bitcoin exchange rate
timer(0, 1 * MIN_IN_MS)
	.pipe(
		switchMap(() => from(getBitcoinExchangeRate())),
		catchError(() => of({})),
		pluck('bitcoin')
	)
	.subscribe(bitcoinExchangeRates$)
