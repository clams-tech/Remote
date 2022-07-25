import CryptoJS from 'crypto-js'
import { onMount, onDestroy, afterUpdate, beforeUpdate } from 'svelte'
import { Subject, defer, BehaviorSubject } from 'rxjs'
import { take, takeUntil } from 'rxjs/operators'
import Big from 'big.js'
import Hammer from 'hammerjs'
import UAParser from 'ua-parser-js'
import { BITCOIN_EXCHANGE_RATE_ENDPOINT, DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from './constants'
import { bitcoinExchangeRates$ } from './streams'

import {
	BitcoinDenomination,
	type BitcoinExchangeRates,
	type Denomination,
	type FiatDenomination,
	type PaymentType,
	type Settings
} from './types'

export const encryptWithAES = (text: string, passphrase: string) => {
	return CryptoJS.AES.encrypt(text, passphrase).toString()
}

export const decryptWithAES = (ciphertext: string, passphrase: string) => {
	const bytes = CryptoJS.AES.decrypt(ciphertext, passphrase)
	const originalText = bytes.toString(CryptoJS.enc.Utf8)
	return originalText
}

export const onMount$ = defer(() => {
	const subject = new Subject<void>()
	onMount(() => {
		subject.next()
	})
	return subject.asObservable().pipe(take(1))
})

export const onDestroy$ = defer(() => {
	const subject = new Subject<void>()
	onDestroy(() => {
		subject.next()
	})
	return subject.asObservable().pipe(take(1))
})

export const afterUpdate$ = defer(() => {
	const subject = new Subject<void>()
	afterUpdate(() => {
		subject.next()
	})
	return subject.asObservable().pipe(takeUntil(onDestroy$))
})

export const beforeUpdate$ = defer(() => {
	const subject = new Subject<void>()
	beforeUpdate(() => {
		subject.next()
	})
	return subject.asObservable().pipe(takeUntil(onDestroy$))
})

export class SvelteSubject<T> extends BehaviorSubject<T> {
	set: BehaviorSubject<T>['next']
	constructor(initialState: T) {
		super(initialState)
		this.set = super.next
	}
}

type FormattedSections = {
	expiry: number
	description: string
	amount: string
	timestamp: number
	[key: string]: string | number
}

export function formatDecodedInvoice(decodedInvoice: {
	paymentRequest: string
	sections: { name: string; value?: string | number }[]
}): {
	paymentRequest: string
	expiry: number
	description: string
	amount: string
	timestamp: number
} {
	const { sections, paymentRequest } = decodedInvoice

	const formattedSections = sections.reduce((acc, { name, value }) => {
		if (name && value) {
			acc[name] = value
		}

		return acc
	}, {} as FormattedSections)

	return { paymentRequest, ...formattedSections }
}

export function truncateValue(request: string): string {
	return `${request.slice(0, 9)}...${request.slice(-9)}`
}

export function getBitcoinExchangeRate(): Promise<{ bitcoin: BitcoinExchangeRates }> {
	return fetch(BITCOIN_EXCHANGE_RATE_ENDPOINT).then((res) => res.json())
}

export function msatsToBtc(msats: string): string {
	return Big(msats === 'any' ? '0' : msats)
		.div(1e11)
		.toString()
}

export function msatsToSats(msats: string): string {
	return Big(msats === 'any' ? '0' : msats)
		.div(1000)
		.toString()
}

export function satsToBtc(sats: string): string {
	return Big(sats).div(1e8).toString()
}

export function satsToMsats(sats: string): string {
	return Big(sats).times(1000).toString()
}

export function btcToMsats(btc: string): string {
	return Big(btc).times(1e11).toString()
}

export function btcToSats(btc: string): number {
	return Big(btc).times(1e8).toNumber()
}

export function fiatToMsats({
	value,
	exchangeRate
}: {
	value: string
	exchangeRate: number
}): string | null {
	if (!exchangeRate) return null
	if (value === '0' || value === '0.' || value === '0.0' || value === '0.00') return value

	const btcValue = Big(1).div(Big(exchangeRate).div(value))

	return btcValue.times(1e11).round().toString()
}

export function msatsToFiat(msats: string, exchangeRate: number): string | null {
	if (!exchangeRate) return null

	return Big(exchangeRate)
		.times(msatsToBtc(msats === 'any' ? '0' : msats))
		.toString()
}

export function convertValue({
	value,
	from,
	to
}: {
	value: string | null
	from: Denomination
	to: Denomination
}): string | null {
	if (from === to) {
		return value
	}

	if (!value) return value

	switch (from) {
		case 'btc':
		case 'sats':
		case 'msats': {
			const valueMsats =
				from === 'msats' ? value : bitcoinDenominationToMsats({ denomination: from, value })

			return convertMsats({
				value: valueMsats,
				denomination: to
			})
		}

		default: {
			const exchangeRate = getExchangeRate(from as FiatDenomination)
			const valueMsats = exchangeRate ? fiatToMsats({ value, exchangeRate }) : null

			if (!valueMsats) return null

			return convertValue({ value: valueMsats, from: BitcoinDenomination.msats, to })
		}
	}
}

function bitcoinDenominationToMsats({
	value,
	denomination
}: {
	value: string
	denomination: string
}): string {
	switch (denomination) {
		case 'btc':
			return btcToMsats(value)
		case 'sats':
			return satsToMsats(value)
		default:
			return value
	}
}

function getExchangeRate(denomination: FiatDenomination): number | null {
	return bitcoinExchangeRates$.value && bitcoinExchangeRates$.value[denomination]
}

export function convertMsats({
	value,
	denomination
}: {
	value: string
	denomination: Denomination
}): string | null {
	switch (denomination) {
		case 'sats':
			return msatsToSats(value)

		case 'btc':
			return msatsToBtc(value)

		case 'msats':
			return value

		// all fiat denominations
		default: {
			const exchangeRate = getExchangeRate(denomination as FiatDenomination)
			return exchangeRate ? msatsToFiat(value, exchangeRate) : null
		}
	}
}

export function isBitcoinDenomination(denomination: Denomination): boolean {
	switch (denomination) {
		case 'btc':
		case 'sats':
		case 'msats': {
			return true
		}

		default: {
			return false
		}
	}
}

export function getSettings(): Settings {
	const value = localStorage.getItem(SETTINGS_STORAGE_KEY)
	const settingsInStorage: Settings | null = value && JSON.parse(value)
	return settingsInStorage || DEFAULT_SETTINGS
}

export function formatValueForDisplay({
	value,
	denomination
}: {
	value: string | null
	denomination: Denomination
}): string {
	if (!value) return ''

	switch (denomination) {
		case 'btc':
			return Big(value).round(8).toString()

		case 'sats':
		case 'msats':
			return Big(value).round().toString()

		// fiat
		default:
			return String(value).includes('.') && value.indexOf('.') <= value.length - 4
				? Big(value).round(2).toString()
				: value
		// return Big(value).toFixed(2)
	}
}

export async function getClipboardPermissions(): Promise<boolean> {
	try {
		const name = 'clipboard-read' as PermissionName
		const { state } = await navigator.permissions.query({ name })

		return state === 'granted'
	} catch (error) {
		return false
	}
}

export async function readClipboardValue(): Promise<string | null> {
	try {
		const clipboardText = await navigator.clipboard.readText()
		return clipboardText || null
	} catch (error) {
		return null
	}
}

/**
 *
 * @returns boolean indicating if write was successful
 */
export async function writeClipboardValue(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text)
		return true
	} catch (error) {
		return false
	}
}

export const clamsTagRegex = /^@[0-9a-zA-Z_-]{1,30}/
export const nodePublicKeyRegex = /[0-9a-fA-F]{66}/
export const lightningInvoiceRegex = /^(lnbcrt|lnbc)[a-zA-HJ-NP-Z0-9]{1,}$/
export const walletIdRegex = /^[A-Za-z0-9_-]{21}$/

export function getPaymentType(value: string): PaymentType | null {
	if (nodePublicKeyRegex.test(value)) {
		return 'node_public_key'
	}

	if (lightningInvoiceRegex.test(value)) {
		return 'payment_request'
	}

	return null
}

type SwipeOptions = {
	direction: number
}

export function swipe(
	node: HTMLElement,
	options?: SwipeOptions
): { update: (options: SwipeOptions) => void; destroy: () => void } {
	const hammer = new Hammer(node)
	hammer.get('swipe').set(options)
	hammer.on('swipe', (ev: unknown) => node.dispatchEvent(new CustomEvent('swipe', { detail: ev })))

	return {
		update(opt) {
			hammer.get('swipe').set(opt)
		},
		destroy() {
			hammer.off('swipe')
		}
	}
}

// Svelte action to use when wanting to do something when there is a click outside of element
export function clickOutside(element: HTMLElement, callbackFunction: () => void) {
	function onClick(event: MouseEvent) {
		if (!element.contains(event.target as HTMLElement)) {
			callbackFunction()
		}
	}

	document.body.addEventListener('click', onClick)

	return {
		update(newCallbackFunction: () => void) {
			callbackFunction = newCallbackFunction
		},
		destroy() {
			document.body.removeEventListener('click', onClick)
		}
	}
}

// browsers use different event names and hidden properties
export function getPageVisibilityParams(): { hidden: string; visibilityChange: string } {
	// Opera 12.10 and Firefox 18 and later support
	if (typeof document.hidden !== 'undefined') {
		return {
			hidden: 'hidden',
			visibilityChange: 'visibilitychange'
		}
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
	} else if (typeof document.msHidden !== 'undefined') {
		return {
			hidden: 'msHidden',
			visibilityChange: 'msvisibilitychange'
		}
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
	} else {
		return {
			hidden: 'webkitHidden',
			visibilityChange: 'webkitvisibilitychange'
		}
	}
}

export function formatDate(ISO: string, style: 'short' | 'medium' | 'long') {
	// new Date(ISO.replace(/ /g, 'T')) work for safari, but not on other browsers
	if (style === 'short') {
		return new Date(ISO).toLocaleString() //@TODO
	}

	if (style === 'medium') {
		return new Date(ISO).toLocaleString() //@TODO
	}

	if (style === 'long') {
		return new Date(ISO).toLocaleString() //@TODO
	}
}

export function formatDestination(destination: string, type: PaymentType): string {
	switch (type) {
		case 'payment_request':
		case 'node_public_key':
			return truncateValue(destination)
		default:
			return destination
	}
}

export const userAgent = new UAParser(navigator.userAgent)
