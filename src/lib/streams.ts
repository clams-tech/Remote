import { BehaviorSubject, from, fromEvent, of, timer } from 'rxjs'
import { catchError, filter, map, shareReplay, startWith, switchMap, take } from 'rxjs/operators'
import {
	BITCOIN_EXCHANGE_RATE_ENDPOINT,
	CORE_LN_CREDENTIALS_INITIAL,
	MIN_IN_MS,
	SETTINGS_STORAGE_KEY
} from './constants'
import { Modals, type BitcoinExchangeRates, type Payment, type Settings } from './types'
import { coreLightning, type CoreLnCredentials, type GetinfoResponse } from './backends'
import { getCredentialsFromStorage, getPageVisibilityParams, getSettings } from './utils'

export const lastPath$ = new BehaviorSubject('/')
export const settings$ = new BehaviorSubject<Settings>(getSettings())
export const bitcoinExchangeRates$ = new BehaviorSubject<BitcoinExchangeRates | null>(null)
export const modal$ = new BehaviorSubject<Modals>(Modals.none)

export const nodeInfo$ = new BehaviorSubject<GetinfoResponse | null>(null)
export const payments$ = new BehaviorSubject<Payment[]>([])

export const credentials$ = new BehaviorSubject<CoreLnCredentials>(
	getCredentialsFromStorage() || CORE_LN_CREDENTIALS_INITIAL
)

// once we have credentials, go ahed and fetch data
credentials$
	.pipe(
		filter(({ connection, rune }) => !!(connection && rune)),
		take(1)
	)
	.subscribe(async () => {
		coreLightning.getInfo().then((info) => {
			console.log(info)
			nodeInfo$.next(info)
		})

		coreLightning.getPayments().then((payments) => {
			console.log(payments)
			payments$.next(payments)
		})
	})

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

export async function waitForAndUpdatePayment(payment: Payment): Promise<void> {
	try {
		const updatedPayment = await coreLightning.waitForInvoicePayment(payment)

		const paymentsUpdate = payments$
			.getValue()
			.map((p) => (p.id === updatedPayment.id ? updatedPayment : p))

		payments$.next(paymentsUpdate)
	} catch (error) {
		console.log('Error waiting for invoice payment:', error)
	}
}

export async function getBitcoinExchangeRate(): Promise<{ bitcoin: BitcoinExchangeRates }> {
	return fetch(BITCOIN_EXCHANGE_RATE_ENDPOINT).then((res) => res.json())
}
