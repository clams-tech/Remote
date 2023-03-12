import type { LnWebSocketOptions } from 'lnmessage/dist/types'
import type {
  DecodedBolt12Invoice,
  DecodedBolt12Offer,
  DecodedCommon,
  OfferCommon
} from './backends'

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

export type PaymentType =
  | 'keysend'
  | 'bolt11'
  | 'lightning_address'
  | 'lnurl'
  | 'onchain'
  | 'bolt12'

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
  invoice?: string
  description?: string
  hash: string
  preimage?: string
  destination?: string
  payIndex?: number
  offer?: {
    /**Indicates if this is an offer that was created by our node */
    local: boolean
    id: DecodedBolt12Offer['offer_id']
    issuer: DecodedBolt12Offer['offer_issuer']
    payerNote?: DecodedBolt12Invoice['invreq_payer_note']
  }
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
export type FormattedDecodedBolt11 = {
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

export type ParsedOnchainString = {
  type: 'onchain'
  value: {
    address: string
    amount?: string | null
    label?: string | null
    message?: string | null
  }
}

export type ParsedOffChainString = {
  type: PaymentType
  value: string
}

export type ParsedBitcoinStringError = {
  error: string
}

export type ParsedBitcoinString =
  | ParsedOnchainString
  | ParsedOffChainString
  | ParsedBitcoinStringError

export type SendPayment = {
  destination: string
  type: PaymentType | null
  description: string
  expiry: number | null
  timestamp: number | null
  amount: string // invoice amount
  value: string // user input amount
}

export enum GenesisBlockhash {
  regtest = '0f9188f13cb7b2c71f2a335e3a4fc328bf5beb436012afca590b1a11466e2206',
  mainnet = '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
  testnet = '000000000933ea01ad0ee984209779baaec3ced90fa3f408719526f8d77f4943'
}

export type FormattedDecodedOffer = {
  offerInvalid: DecodedCommon['valid']
  offerType: DecodedCommon['type']
  offerExpiry: OfferCommon['offer_absolute_expiry']
  recurrence: OfferCommon['offer_recurrence']
  description: OfferCommon['offer_description']
  issuer: OfferCommon['offer_issuer']
  denomination: BitcoinDenomination.msats | FiatDenomination
  amount: string
  nodeId: OfferCommon['offer_node_id']
  quantityMax: OfferCommon['offer_quantity_max']
}
