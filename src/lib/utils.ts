import CryptoJS from 'crypto-js'
import { onMount, onDestroy, afterUpdate, beforeUpdate } from 'svelte'
import { Subject, defer, BehaviorSubject, Observable } from 'rxjs'
import { take, takeUntil } from 'rxjs/operators'
import Big from 'big.js'
import Hammer from 'hammerjs'
import UAParser from 'ua-parser-js'
import { formatRelative, type Locale } from 'date-fns'
import type { Load } from '@sveltejs/kit'
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from './constants'
import type { CoreLnCredentials } from './backends'
import type { Denomination, PaymentType, Settings } from './types'

import {
	ar,
	bn,
	enGB,
	enUS,
	es,
	fr,
	hi,
	id,
	ja,
	pt,
	ru,
	zhCN,
	de,
	te,
	tr,
	ta,
	ko
} from 'date-fns/locale'
import { credentials$ } from './streams'

export const encryptWithAES = (text: string, passphrase: string) => {
	return CryptoJS.AES.encrypt(text, passphrase).toString()
}

export const decryptWithAES = (ciphertext: string, passphrase: string) => {
	const bytes = CryptoJS.AES.decrypt(ciphertext, passphrase)
	const originalText = bytes.toString(CryptoJS.enc.Utf8)
	return originalText
}

export class SvelteSubject<T> extends BehaviorSubject<T> {
	set: BehaviorSubject<T>['next']
	constructor(initialState: T) {
		super(initialState)
		this.set = super.next
	}
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

export const nodePublicKeyRegex = /[0-9a-fA-F]{66}/
export const lightningInvoiceRegex = /^(lnbcrt|lnbc)[a-zA-HJ-NP-Z0-9]{1,}$/

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

// https://github.com/date-fns/date-fns/blob/9bb51691f201c3ec05ab832acbc5d478f2e5c47a/docs/i18nLocales.md
const locales: Record<string, Locale> = {
	'en-GB': enGB, // British English
	'en-US': enUS, // American English
	'zh-CN': zhCN, // Chinese (mainland)
	es, // Spanish
	hi, // Hindi
	ar, // Arabic
	bn, // Bengali
	fr, // French
	pt, // Portuguese
	ru, // Russian
	ja, // Japanese
	id, // Indonesian
	de, // German
	te, // Telugu
	tr, // Turkish
	ta, // Tamil
	ko // Korean
}

export function formatDate(options: { date: string; language: string; type?: 'relative' }) {
	const { date, language, type = 'relative' } = options
	const locale = locales[language] || enGB

	if (type === 'relative') {
		return formatRelative(new Date(date), new Date(), { locale })
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

export function getCredentialsFromStorage(): CoreLnCredentials | null {
	const credentialsJson = localStorage.getItem('credentials')

	return credentialsJson ? JSON.parse(credentialsJson) : null
}

export const load: Load = async () => {
	const credentials = credentials$.getValue()

	if (!credentials.connection) {
		return {
			redirect: '/connect',
			status: 302
		}
	}
}

// https://github.com/danguer/blog-examples/blob/master/js/base64-binary.js
export const Base64Binary = {
	_keyStr: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',

	removePaddingChars: function (input: string) {
		const lkey = this._keyStr.indexOf(input.charAt(input.length - 1))

		if (lkey == 64) {
			return input.substring(0, input.length - 1)
		}

		return input
	},

	decode: function (input: string) {
		//get last chars to see if are valid
		input = this.removePaddingChars(input)
		input = this.removePaddingChars(input)

		const bytes = parseInt(((input.length / 4) * 3).toString(), 10)

		let chr1, chr2, chr3
		let enc1, enc2, enc3, enc4
		let i = 0
		let j = 0

		const uarray = new Uint8Array(bytes)

		// input = input.replace(/[^A-Za-z0-9+/=]/g, '')

		for (i = 0; i < bytes; i += 3) {
			//get the 3 octects in 4 ascii chars
			enc1 = this._keyStr.indexOf(input.charAt(j++))
			enc2 = this._keyStr.indexOf(input.charAt(j++))
			enc3 = this._keyStr.indexOf(input.charAt(j++))
			enc4 = this._keyStr.indexOf(input.charAt(j++))

			chr1 = (enc1 << 2) | (enc2 >> 4)
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2)
			chr3 = ((enc3 & 3) << 6) | enc4

			uarray[i] = chr1
			if (enc3 != 64) uarray[i + 1] = chr2
			if (enc4 != 64) uarray[i + 2] = chr3
		}

		return uarray
	}
}

function i2hex(i: number) {
	return ('0' + i.toString(16)).slice(-2)
}

export const binaryHashToHex = (hash: Uint8Array): string => {
	return hash.reduce(function (memo, i) {
		return memo + i2hex(i)
	}, '')
}

export const decodeRune = (rune: string) => {
	const runeBinary = Base64Binary.decode(rune)
	const hashBinary = runeBinary.slice(0, 32)

	const hash = binaryHashToHex(hashBinary)

	const restBinary = runeBinary.slice(32)
	const [id, ...restrictions] = new TextDecoder().decode(restBinary).split('&')
	const runeId = id.split('=')[1]

	console.log({ restrictions, runeId, hash })
}
