import { BehaviorSubject, from, fromEvent, of, timer } from 'rxjs'
import { catchError, map, shareReplay, startWith, switchMap } from 'rxjs/operators'
import { BITCOIN_EXCHANGE_RATE_ENDPOINT, MIN_IN_MS, SETTINGS_STORAGE_KEY } from './constants'
import { Modals, type BitcoinExchangeRates, type Payment, type Settings } from './types'
import { coreLightning, type GetinfoResponse } from './backends'
import { getPageVisibilityParams, getSettings } from './utils'

export const lastPath$ = new BehaviorSubject('/')
export const settings$ = new BehaviorSubject<Settings>(getSettings())
export const bitcoinExchangeRates$ = new BehaviorSubject<BitcoinExchangeRates | null>(null)
export const modal$ = new BehaviorSubject<Modals>(Modals.none)

export const nodeInfo$ = new BehaviorSubject<GetinfoResponse | null>(null)
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

export function getBitcoinExchangeRate(): Promise<{ bitcoin: BitcoinExchangeRates }> {
	return fetch(BITCOIN_EXCHANGE_RATE_ENDPOINT).then((res) => res.json())
}
