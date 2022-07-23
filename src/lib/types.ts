export type Settings = {
	language: Language
	fiatDenomination: FiatDenomination
	bitcoinDenomination: BitcoinDenomination
	primaryDenomination: Denomination
	secondaryDenomination: Denomination
	invoiceExpiry: number
	sendMaxFeePercent: number
	sendTimeoutSeconds: number
	notifications: boolean
	darkmode: boolean
}

export enum Language {
	english = 'English',
	spanish = 'Spanish',
	french = 'French',
	german = 'German'
}

export enum BitcoinDenomination {
	btc = 'btc',
	sats = 'sats',
	msats = 'msats'
}

// https://www.statista.com/statistics/1189498/share-of-global-payments-by-currency/
export enum FiatDenomination {
	'usd' = 'usd',
	'eur' = 'eur',
	'gbp' = 'gbp',
	'cny' = 'cny',
	'jpy' = 'jpy',
	'cad' = 'cad',
	'aud' = 'aud',
	'hkd' = 'hkd',
	'sgd' = 'sgd',
	'sek' = 'sek',
	'chf' = 'chf',
	'thb' = 'thb',
	'pln' = 'pln',
	'nok' = 'nok',
	'myr' = 'myr',
	'dkk' = 'dkk',
	'zar' = 'zar',
	'nzd' = 'nzd',
	'mxn' = 'mxn',
	'rub' = 'rub'
}

export type Denomination = BitcoinDenomination | FiatDenomination

export type BitcoinExchangeRates = Record<FiatDenomination, number>

export enum Modals {
	none = 0,
	clipboard
}

export type PaymentType = 'node_public_key' | 'payment_request' | 'lightning_address' | 'lnurl'
