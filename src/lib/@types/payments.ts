import type { DecodedBolt12Invoice, DecodedBolt12Offer } from 'bolt12-decoder/@types/types.js'
import type { Metadata } from './metadata.js'

export type PaymentBase = {
  /** payment hash, txid or address */
  id: string
  walletId: string
  status: PaymentStatus
  timestamp: number
  network: Network
  metadata?: Metadata
}

export type TransactionPayment = PaymentBase & {
  type: 'transaction'
  data: {
    rawTx: string
    blockHeight: number | null
    txindex: number | null
    locktime: number
    version: number
    rbfEnabled: boolean
    inputs: Array<{
      txid: string
      index: number
      sequence: number
      metadata?: Metadata
    }>
    outputs: Array<{
      index: number
      amount: number
      address: string
      metadata?: Metadata
    }>
    channel?: {
      type: 'open' | 'close' | 'force_close'
      amount: number
      id: string
    }
    fee?: number
  }
}

export type AddressPayment = PaymentBase & {
  type: 'address'
  data: {
    /** Amount sats expected */
    amount: number
    /** unix timestamp this address was created */
    createdAt: number
    /** unix timestamp of confirmed tx received to this address */
    completedAt?: number
    /** label added to BIP21 QR */
    label?: string
    /** message added to BIP21 QR */
    message?: string
    /** the tx id of the tx sent to this address */
    txid?: string
    direction: PaymentDirection
  }
}

export type InvoicePayment = PaymentBase & {
  type: 'invoice'
  data: {
    amount: number
    fee?: number
    createdAt: number // unix seconds
    completedAt?: number // unix seconds
    expiresAt?: number // unix seconds
    type: 'bolt11' | 'bolt12' | 'keysend'
    /** BOLT11 | BOLT12 */
    request?: string
    counterpartyNode?: string
    description?: string
    preimage?: string
    payIndex?: number
    fallbackAddress?: string
    direction: PaymentDirection
    offer?: {
      id?: string
      issuer?: DecodedBolt12Offer['offer_issuer']
      payerNote?: DecodedBolt12Invoice['invreq_payer_note']
      description?: DecodedBolt12Offer['offer_description']
    }
  }
}

export type Payment = TransactionPayment | AddressPayment | InvoicePayment
export type PaymentType = 'invoice' | 'transaction' | 'address'
export type PaymentDirection = 'receive' | 'send'
export type PaymentStatus = 'waiting' | 'pending' | 'complete' | 'expired' | 'failed'
export type Network = 'testnet' | 'regtest' | 'signet' | 'bitcoin'
