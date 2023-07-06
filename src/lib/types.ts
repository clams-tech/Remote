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
    id?: DecodedBolt12Offer['offer_id']
    issuer: DecodedBolt12Offer['offer_issuer']
    payerNote?: DecodedBolt12Invoice['invreq_payer_note']
    payerId?: DecodedBolt12Invoice['invreq_payer_id']
    description?: DecodedBolt12Offer['offer_description']
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
  offerType: DecodedCommon['type']
  denomination: BitcoinDenomination.msats | FiatDenomination
  amount: string
  description: OfferCommon['offer_description']
  nodeId: OfferCommon['offer_node_id']
  offerExpiry?: OfferCommon['offer_absolute_expiry']
  recurrence?: OfferCommon['offer_recurrence']
  issuer?: OfferCommon['offer_issuer']
  quantityMax?: OfferCommon['offer_quantity_max']
}

export type ChannelStatus =
  | 'OPENING'
  | 'CHANNEL_AWAITING_LOCKIN'
  | 'CHANNEL_NORMAL'
  | 'CHANNEL_SHUTTING_DOWN'
  | 'CLOSING_SIGEXCHANGE'
  | 'CLOSING_COMPLETE'
  | 'AWAITING_UNILATERAL'
  | 'FUNDING_SPEND_SEEN'
  | 'ONCHAIN'
  | 'DUALOPEN_OPEN_INIT'
  | 'DUALOPEN_AWAITING_LOCKIN'

export type Channel = {
  /** full channel id */
  id: string
  /** short channel id */
  shortId: string | null
  /** which side opened this channel */
  opener: 'local' | 'remote'
  /** funding transaction id */
  fundingTransactionId: string
  /** 0-based index of the output in the funding transaction */
  fundingOutput: number
  /** id of node with which channel is opened */
  peerId: string
  /** alias of node with which channel is opened */
  peerAlias?: string
  status: ChannelStatus
  /** msat */
  balanceLocal: string
  /** msat */
  balanceRemote: string
  /** msat */
  reserveLocal: string
  /** msat */
  reserveRemote: string
  /** amount we charge to use the channel (msat) */
  feeBase: string | null
  /** amount we charge to use the channel in parts-per-million */
  feePpm: number
  /** the min htlc msat size we will forward */
  htlcMin: string | null
  /** the max htlc msat size we will forward */
  htlcMax: string | null
  /** The bitcoin address we will close to */
  closeToAddress: string | null
  /** The bitcoin address we will close to */
  closeToScriptPubkey: string | null
  htlcs: HTLC[]
  /** which side closed this channel */
  closer?: 'local' | 'remote'
}

type HTLC = {
  direction: 'in' | 'out'
  id: number
  /** msat */
  amount: string
  expiry: number
  paymentHash: string
  state: HTLCState
}

type HTLCState =
  | 'SENT_ADD_HTLC'
  | 'SENT_ADD_COMMIT'
  | 'RCVD_ADD_REVOCATION'
  | 'RCVD_ADD_ACK_COMMIT'
  | 'SENT_ADD_ACK_REVOCATION'
  | 'RCVD_REMOVE_HTLC'
  | 'RCVD_REMOVE_COMMIT'
  | 'SENT_REMOVE_REVOCATION'
  | 'SENT_REMOVE_ACK_COMMIT'
  | 'RCVD_REMOVE_ACK_REVOCATION'
  | 'RCVD_ADD_HTLC'
  | 'RCVD_ADD_COMMIT'
  | 'SENT_ADD_REVOCATION'
  | 'SENT_ADD_ACK_COMMIT'
  | 'RCVD_ADD_ACK_REVOCATION'
  | 'SENT_REMOVE_HTLC'
  | 'SENT_REMOVE_COMMIT'
  | 'RCVD_REMOVE_REVOCATION'
  | 'RCVD_REMOVE_ACK_COMMIT'
  | 'SENT_REMOVE_ACK_REVOCATION'

export type Forward = {
  /** hash of the whole forward */
  id: string
  /** the short channel id in */
  shortIdIn: string
  /** the short channel id in */
  shortIdOut: string
  htlcInId: number
  htlcOutId: number
  /** amount msat in */
  in: string | number
  /** amount msat out */
  out: string | number
  /** fee amount msat */
  fee: string | number
  status: 'settled' | 'offered' | 'failed' | 'local_failed'
  style: 'tlv' | 'legacy'
  /** unix timestamp seconds start */
  started: number
  /** unix timestamp seconds complete */
  completed?: number
}
