import type { Address } from './addresses.js'
import type { Invoice } from './invoices.js'
import type { Transaction } from './transactions.js'

export type PaymentStatus = 'waiting' | 'pending' | 'complete' | 'expired' | 'failed'

export type ParsedInput = {
  type:
    | 'onchain'
    | 'node_publickey'
    | 'node_address'
    | 'invoice'
    | 'offer'
    | 'lnurl'
    | 'lightning_address'
    | 'unknown'
  value: string
  /** invoice for lightning param */
  lightning?: string
  amount?: number | null
  label?: string | null
  message?: string | null
}

export type Network = 'testnet' | 'regtest' | 'signet' | 'bitcoin'

export type Payment = {
  id: string
  type: 'invoice' | 'address' | 'transaction'
  status: PaymentStatus
  timestamp: number
  network: Network
  walletId: string
  data: Invoice | Transaction | Address
  fee?: number
  amount?: number
  offer?: boolean
  channel?: boolean
}
