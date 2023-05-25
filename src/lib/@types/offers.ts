import type { BitcoinDenomination, FiatDenomination } from './settings.js'

export type Offer = {
  id: string
  bolt12: string
  type: 'pay' | 'withdraw'
  denomination: BitcoinDenomination.msats | FiatDenomination
  amount: string
  description: string
  nodeId: string
  used?: boolean
  singleUse?: boolean
  active?: boolean
  label?: string
  expiry?: number
  issuer?: string
  quantityMax?: number
}

export type CreatePayOfferOptions = {
  amount: string
  description: string
  issuer?: string
  label?: string
  quantityMax?: number
  expiry?: number
  singleUse?: boolean
}

export type CreateWithdrawOfferOptions = {
  amount: string
  description: string
  issuer?: string
  label?: string
  expiry?: number
  singleUse?: boolean
}

export type FetchInvoiceOptions = {
  offer: string
  amount?: string
  quantity?: number
  timeout?: number
  payerNote?: string
}

export type SendInvoiceOptions = {
  offer: string
  label: string
  amount?: string
  quantity?: number
  timeout?: number
}
