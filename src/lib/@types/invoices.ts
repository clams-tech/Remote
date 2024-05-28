import type { PaymentType } from './payments.js'

export type SendPaymentOptions = {
  id: string
  request: string
  amount?: number
  maxFeePercent?: number
  retryFor?: number
  maxDelay?: string
}

export type PayKeysendOptions = {
  id: string
  destination: string
  amount: number
  maxFeePercent?: number
  retryFor?: number
  maxDelay?: string
  /** map of tlv number to hex encoded utf-8 string */
  tlvs?: Record<number, string>
}

export type CreateInvoiceOptions = {
  amount: number
  id: string
  description: string
  expiry?: number
  exposePrivateChannels?: boolean
}

export type PayInvoiceOptions = {
  request: string
  id: string
  amount?: number
  /** required if the invoice contains a description hash
   * to validate they match
   */
  description?: unknown
}

export type DecodedBolt11Invoice = {
  nodeId: string
  createdAt: number
  expiresAt: number
  amount: number
  hash: string
  description: string | null
  descriptionHash: string | null
}

export type SendPayment = {
  destination: string
  type: PaymentType | null
  description: string
  expiry: number | null
  timestamp: number | null
  amount: number // invoice amount
  value: number // user input amount
}
