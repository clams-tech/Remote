import { from, timer } from 'rxjs'
import { filter, pluck, skip, switchMap, take, withLatestFrom } from 'rxjs/operators'
import { coreLightning } from './backends'
import { MIN_IN_MS, SETTINGS_STORAGE_KEY } from './constants'
import { getBitcoinExchangeRate, listenForAllInvoiceUpdates } from './utils'

import {
	appVisible$,
	bitcoinExchangeRates$,
	credentials$,
	funds$,
	listeningForAllInvoiceUpdates$,
	nodeInfo$,
	payments$,
	settings$
} from './streams'

function registerSideEffects() {
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
					nodeInfo$.next({ loading: false, data: null, error: error && error.message })
				})

			coreLightning
				.getPayments()
				.then((data) => {
					payments$.next({ loading: false, data })
				})
				.catch((error) => {
					payments$.next({ loading: false, data: null, error: error && error.message })
				})

			coreLightning
				.listFunds()
				.then((data) => {
					funds$.next({ loading: false, data })
				})
				.catch((error) => {
					funds$.next({ loading: false, data: null, error: error && error.message })
				})
		})

	// handle dark mode toggle
	settings$.subscribe(({ darkmode }) => {
		document.documentElement.classList[darkmode ? 'add' : 'remove']('dark')
	})

	// update settings in storage
	settings$
		.pipe(skip(1))
		.subscribe((update) => localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(update)))

	// get and update bitcoin exchange rate
	timer(0, 1 * MIN_IN_MS)
		.pipe(switchMap(() => from(getBitcoinExchangeRate())))
		.subscribe(bitcoinExchangeRates$)

	// when app is focused, start listening if not already
	appVisible$
		.pipe(
			filter((x) => x),
			withLatestFrom(listeningForAllInvoiceUpdates$),
			pluck('1')
		)
		.subscribe((listening) => {
			if (!listening) {
				listenForAllInvoiceUpdates().catch(console.log)
			}
		})
}

export default registerSideEffects
