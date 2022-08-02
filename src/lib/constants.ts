import type { CoreLnCredentials } from './backends'
import { BitcoinDenomination, FiatDenomination, Language, type Settings } from './types'

export const DEV = import.meta.env.DEV
export const MODE = import.meta.env.MODE

export const lnsocketProxy = 'wss://lnsocket.clams.tech'

export const BITCOIN_EXCHANGE_RATE_ENDPOINT = `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${Object.keys(
	FiatDenomination
).join(',')}`

export const SEC_IN_MS = 1000
export const MIN_IN_MS = 60 * 1000
export const MIN_IN_SECS = 60

export const DEFAULT_INVOICE_EXPIRY = 15 * MIN_IN_SECS

export const DEFAULT_SETTINGS: Settings = {
	language: navigator?.languages ? navigator.languages[0] : navigator.language || Language['en-US'],
	fiatDenomination: FiatDenomination.usd,
	bitcoinDenomination: BitcoinDenomination.sats,
	primaryDenomination: BitcoinDenomination.sats,
	secondaryDenomination: FiatDenomination.usd,
	invoiceExpiry: DEFAULT_INVOICE_EXPIRY,
	sendMaxFeePercent: 0.5,
	sendTimeoutSeconds: 120,
	notifications: true,
	darkmode: false
}

export const SETTINGS_STORAGE_KEY = 'clams-app:settings'

export const CORE_LN_CREDENTIALS_DEFAULT: CoreLnCredentials = {
	connection: '',
	rune: ''
}
