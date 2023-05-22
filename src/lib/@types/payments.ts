export type Payment = {
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
  nodeId: string
  /** BOLT11 | BOLT12 */
  invoice?: string
  description?: string
  preimage?: string
  destination?: string
  payIndex?: number
  offerId?: string
}

export type PaymentType = 'keysend' | 'bolt11' | 'lightning_address' | 'lnurl' | 'bolt12'

type PaymentDirection = 'receive' | 'send'

export type PaymentStatus = 'pending' | 'complete' | 'expired' | 'failed'

/** Formatted decoded sections of invoice */
export type FormattedDecodedBolt11 = {
  expiry: number
  description?: string
  description_hash?: Buffer
  amount: string
  timestamp: number
  [key: string]: string | number | undefined | Buffer
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
