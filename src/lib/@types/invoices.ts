import type { DecodedBolt12Invoice, DecodedBolt12Offer } from 'bolt12-decoder/@types/types.js'

export type Invoice = {
  id: string
  status: PaymentStatus
  direction: PaymentDirection
  value: string // msat
  fee: string | null // msat
  type: PaymentType
  startedAt: number // unix seconds
  completedAt: number | null // unix seconds
  expiresAt: number | null // unix seconds
  hash: string
  connectionId: string
  /** BOLT11 | BOLT12 */
  request: string
  nodeId: string
  description?: string
  preimage?: string
  payIndex?: number
  offer?: {
    id?: string
    issuer: DecodedBolt12Offer['offer_issuer']
    payerNote?: DecodedBolt12Invoice['invreq_payer_note']
    payerId?: DecodedBolt12Invoice['invreq_payer_id']
    description?: DecodedBolt12Offer['offer_description']
  }
}

export type SendPaymentOptions = {
  id: string
  request: string
  amount?: string
  maxFeePercent?: string
  retryFor?: number
  maxDelay?: string
}

export type PayKeysendOptions = {
  id: string
  destination: string
  amount: string
  maxFeePercent?: string
  retryFor?: number
  maxDelay?: string
}

export type CreateInvoiceOptions = {
  amount: string | 'any'
  id: string
  description: string
  expiry?: number
}

export type PayInvoiceOptions = {
  request: string
  id: string
  amount?: string
  /** required if the invoice contains a description hash
   * to validate they match
   */
  description?: unknown
}

export type PaymentType = 'keysend' | 'bolt11' | 'lightning_address' | 'lnurl' | 'bolt12'

type PaymentDirection = 'receive' | 'send'

export type PaymentStatus = 'pending' | 'complete' | 'expired' | 'failed'

export type DecodedBolt11Invoice = {
  nodeId: string
  startedAt: number
  expiresAt: number
  value: string
  hash: string
  description: string
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
