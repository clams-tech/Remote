import { BehaviorSubject, from, fromEvent, of, timer } from 'rxjs'
import {
	catchError,
	filter,
	map,
	shareReplay,
	skip,
	startWith,
	switchMap,
	take
} from 'rxjs/operators'
import { Modals, type BitcoinExchangeRates, type Payment, type Settings } from './types'
import { getCredentialsFromStorage, getPageVisibilityParams, getSettings } from './utils'

import {
	BITCOIN_EXCHANGE_RATE_ENDPOINT,
	CORE_LN_CREDENTIALS_INITIAL,
	MIN_IN_MS,
	SETTINGS_STORAGE_KEY
} from './constants'

import {
	coreLightning,
	type CoreLnCredentials,
	type GetinfoResponse,
	type ListfundsResponse
} from './backends'

export const lastPath$ = new BehaviorSubject('/')
export const settings$ = new BehaviorSubject<Settings>(getSettings())
export const bitcoinExchangeRates$ = new BehaviorSubject<BitcoinExchangeRates | null>(null)
export const modal$ = new BehaviorSubject<Modals>(Modals.none)

export const credentials$ = new BehaviorSubject<CoreLnCredentials>(
	getCredentialsFromStorage() || CORE_LN_CREDENTIALS_INITIAL
)

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

// once we have credentials, go ahead and fetch initial data
credentials$
	.pipe(
		filter(({ connection, rune }) => !!(connection && rune)),
		take(1)
	)
	.subscribe(async (credentials) => {
		localStorage.setItem('credentials', JSON.stringify(credentials))

		coreLightning
			.getInfo()
			.then((data) => {
				nodeInfo$.next({ loading: false, data })
			})
			.catch((error) => {
				nodeInfo$.next({ loading: false, data: null, error: error.message })
			})

		coreLightning
			.getPayments()
			.then((data) => {
				payments$.next({ loading: false, data })
			})
			.catch((error) => {
				payments$.next({ loading: false, data: null, error: error.message })
			})

		coreLightning
			.listFunds()
			.then((data) => {
				funds$.next({ loading: false, data })
			})
			.catch((error) => {
				funds$.next({ loading: false, data: null, error: error.message })
			})
	})

// handle dark mode toggle
settings$.subscribe(({ darkmode }) => {
	document.documentElement.classList[darkmode ? 'add' : 'remove']('dark')
})

const pageVisibilityParams = getPageVisibilityParams()

export const appVisible$ = fromEvent(document, pageVisibilityParams.visibilityChange).pipe(
	map(() => !document[pageVisibilityParams.hidden as keyof Document]),
	startWith(true),
	shareReplay(1)
)

// update settings in storage
settings$
	.pipe(skip(1))
	.subscribe((update) => localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(update)))

// get and update bitcoin exchange rate
timer(0, 1 * MIN_IN_MS)
	.pipe(
		switchMap(() => from(getBitcoinExchangeRate())),
		catchError(() => of({ bitcoin: null })),
		map(({ bitcoin }) => bitcoin)
	)
	.subscribe(bitcoinExchangeRates$)

export async function waitForAndUpdatePayment(payment: Payment): Promise<void> {
	try {
		const updatedPayment = await coreLightning.waitForInvoicePayment(payment)

		const currentPayments = payments$.getValue().data

		const paymentsUpdate = currentPayments
			? currentPayments.map((p) => (p.id === updatedPayment.id ? updatedPayment : p))
			: [updatedPayment]

		payments$.next({ data: paymentsUpdate })
	} catch (error) {
		console.log('Error waiting for invoice payment:', error)
	}
}

export function addPayment(payment: Payment): void {
	const currentPayments = payments$.getValue().data || []
	payments$.next({ data: [...currentPayments, payment] })
}

export async function getBitcoinExchangeRate(): Promise<{ bitcoin: BitcoinExchangeRates }> {
	return fetch(BITCOIN_EXCHANGE_RATE_ENDPOINT).then((res) => res.json())
}
