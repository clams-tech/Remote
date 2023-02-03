import type { LnWebSocketOptions } from 'lnmessage/dist/types'

export type Auth = {
  /** <node_public_key>@<ip>:<port>*/
  address: string
  /** token used for RPC requests */
  token: string
  /** private key used for lnconnect for consistent browser node public key
   * this is useful for creating a token that is limited to a particular session
   * that persists in local storage until logged out
   */
  sessionSecret?: string
}

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
  encrypt: boolean
  wsProxy: LnWebSocketOptions['wsProxy']
  directConnection?: LnWebSocketOptions['wsProtocol']
}

// locale => Display language
export enum Language {
  'en-US' = 'English (US)', // American
  'en-GB' = 'English (UK)', // British
  'zh-CN' = 'Chinese', // Mainland
  es = 'Spanish',
  hi = 'Hindi',
  ar = 'Arabic',
  bn = 'Bengali',
  fr = 'French',
  pt = 'Portuguese',
  ru = 'Russian',
  ja = 'Japanese',
  id = 'Indonesian',
  de = 'German',
  te = 'Telugu',
  tr = 'Turkish',
  ta = 'Tamil',
  ko = 'Korean'
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

export type PaymentType = 'node_public_key' | 'payment_request' | 'lightning_address' | 'lnurl'

export type Payment = {
  id: string
  status: PaymentStatus
  direction: PaymentDirection
  value: string // msat
  fee: string | null // msat
  type: PaymentType
  startedAt: string // ISO UTC
  completedAt: string | null // ISO UTC
  expiresAt: string | null // ISO UTC
  bolt11: string | null
  description?: string
  hash: string
  preimage?: string
  destination?: string
  payIndex?: number
}

type PaymentDirection = 'receive' | 'send'

export type PaymentStatus = 'pending' | 'complete' | 'expired' | 'failed'

export type Notification = {
  id: string
  type: 'error' | 'hint' | 'success'
  heading: string
  message: string
}

/** Formatted decoded sections of invoice */
export type FormattedSections = {
  expiry: number
  description?: string
  description_hash?: Buffer
  amount: string
  timestamp: number
  [key: string]: string | number | undefined | Buffer
}

export type DropdownOption = {
  display: string
  value?: string
  onclick?: (event: Event) => void
  href?: string
  target?: string
  rel?: string
}

export type ParsedNodeAddress = {
  publicKey: string
  ip: string
  port?: number
}

export type DecodedInvoice = {
  paymentRequest: string
  sections: { name: string; value?: string | number }[]
}
