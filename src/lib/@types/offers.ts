import type { BitcoinDenomination, FiatDenomination } from './settings.js'

export type Offer = {
  id: string
  bolt12: string
  type: 'pay' | 'withdraw'
  denomination: BitcoinDenomination.sats | FiatDenomination
  amount: number
  description: string
  walletId: string
  used?: boolean
  singleUse?: boolean
  active?: boolean
  label?: string
  expiry?: number
  issuer?: string
  quantityMax?: number
}

export type CreatePayOfferOptions = {
  amount: number
  description: string
  issuer?: string
  label?: string
  quantityMax?: number
  /** relative expiry seconds */
  expiry?: number
  singleUse?: boolean
}

export type CreateWithdrawOfferOptions = {
  amount: number
  description: string
  issuer?: string
  label?: string
  /** relative expiry seconds */
  expiry?: number
  singleUse?: boolean
}

export type FetchInvoiceOptions = {
  offer: string
  amount?: number
  quantity?: number
  timeout?: number
  payerNote?: string
}

export type SendInvoiceOptions = {
  offer: string
  label: string
  amount?: number
  quantity?: number
  timeout?: number
}
