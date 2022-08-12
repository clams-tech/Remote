import { BehaviorSubject, fromEvent } from 'rxjs'
import { map, shareReplay, startWith } from 'rxjs/operators'
import type { CoreLnCredentials, GetinfoResponse, ListfundsResponse } from './backends'
import { CORE_LN_CREDENTIALS_INITIAL } from './constants'
import { Modals, type BitcoinExchangeRates, type Payment, type Settings } from './types'
import { getCredentialsFromStorage, getPageVisibilityParams, getSettings } from './utils'

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

const pageVisibilityParams = getPageVisibilityParams()

export const appVisible$ = fromEvent(document, pageVisibilityParams.visibilityChange).pipe(
	map(() => !document[pageVisibilityParams.hidden as keyof Document]),
	startWith(true),
	shareReplay(1)
)
