import { from, timer } from 'rxjs'

import {
	distinctUntilKeyChanged,
	filter,
	pluck,
	skip,
	switchMap,
	take,
	withLatestFrom
} from 'rxjs/operators'

import { coreLightning } from './backends'
import { MIN_IN_MS, SETTINGS_STORAGE_KEY } from './constants'
import { t } from './i18n/translations'
import { get } from 'svelte/store'
import { convertValue } from './conversion'
import { BitcoinDenomination, Modals } from './types'

import {
	formatValueForDisplay,
	getBitcoinExchangeRate,
	listenForAllInvoiceUpdates,
	updatePayments
} from './utils'

import {
	appVisible$,
	bitcoinExchangeRates$,
	credentials$,
	funds$,
	listeningForAllInvoiceUpdates$,
	modal$,
	nodeInfo$,
	payments$,
	paymentUpdates$,
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
			// store credentials
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

	// update payments when payment update comes through
	paymentUpdates$.subscribe(updatePayments)

	// handle notifications for payment updates
	paymentUpdates$
		.pipe(
			filter(({ status }) => status !== 'pending'),
			withLatestFrom(settings$)
		)
		.subscribe(async ([payment, settings]) => {
			const { notifications, primaryDenomination } = settings

			if (notifications && Notification.permission === 'granted') {
				const { status, direction, value, description } = payment

				const convertedValue = convertValue({
					value,
					from: BitcoinDenomination.msats,
					to: primaryDenomination
				})

				const img = '/clams-icon.png'

				const text = `${get(t)('app.payment.status', {
					direction,
					status
				})} ${formatValueForDisplay({
					value: convertedValue,
					denomination: primaryDenomination
				})} for ${description || 'unknown'}`

				new Notification('Payment', { body: text, icon: img })
			}
		})

	// handle dark mode toggle
	settings$.pipe(distinctUntilKeyChanged('darkmode')).subscribe(({ darkmode }) => {
		document.documentElement.classList[darkmode ? 'add' : 'remove']('dark')
	})

	// handle notifications toggle
	settings$
		.pipe(filter(({ notifications }) => !!notifications))
		.subscribe(async (currentSettings) => {
			try {
				const permission = await Notification.requestPermission()

				if (permission === 'denied') {
					modal$.next(Modals.notificationsDisabled)
				}

				if (permission !== 'granted') {
					settings$.next({ ...currentSettings, notifications: false })
				}
			} catch (error) {
				settings$.next({ ...currentSettings, notifications: false })
			}
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
				listeningForAllInvoiceUpdates$.next(true)
				listenForAllInvoiceUpdates().catch(() => {
					console.log('error listening for invoice updates')
					listeningForAllInvoiceUpdates$.next(false)
				})
			}
		})
}

export default registerSideEffects
