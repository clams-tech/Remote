import type { DecodedBolt12Invoice, DecodedBolt12Offer } from 'bolt12-decoder/@types/types.js'
import type { TransactionStatus } from './common.js'

export type Invoice = {
  id: string
  status: TransactionStatus
  direction: PaymentDirection
  amount: string // msat
  fee?: string // msat
  type: PaymentType
  createdAt: number // unix seconds
  completedAt?: number // unix seconds
  expiresAt?: number // unix seconds
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
  /** map of tlv number to hex encoded utf-8 string */
  tlvs?: Record<number, string>
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

export type DecodedBolt11Invoice = {
  nodeId: string
  createdAt: number
  expiresAt: number
  amount: string
  hash: string
  description: string
}

export type SendPayment = {
  destination: string
  type: PaymentType | null
  description: string
  expiry: number | null
  timestamp: number | null
  amount: string // invoice amount
  value: string // user input amount
}
