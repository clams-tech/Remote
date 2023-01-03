import Big from 'big.js'
import { decode } from 'light-bolt11-decoder'
import type { DecodedInvoice, Payment } from '$lib/types'
import { formatDecodedInvoice, formatMsat, logger } from '$lib/utils'

import type { InvoiceStatus, Invoice, Pay } from './types'
import { MIN_IN_SECS } from '$lib/constants'

export function invoiceStatusToPaymentStatus(status: InvoiceStatus): Payment['status'] {
  switch (status) {
    case 'paid':
      return 'complete'
    case 'unpaid':
      return 'pending'
    default:
      return 'expired'
  }
}

export function invoiceToPayment(invoice: Invoice): Payment {
  const {
    bolt11,
    payment_hash,
    amount_received_msat,
    amount_msat,
    status,
    paid_at,
    payment_preimage,
    description,
    expires_at,
    pay_index
  } = invoice

  let timestamp: number

  try {
    const decodedInvoice: DecodedInvoice = decode(bolt11)
    timestamp = formatDecodedInvoice(decodedInvoice).timestamp
  } catch (error) {
    logger.error(`Unable to decode bolt11: ${bolt11}`)
    timestamp = expires_at - 15 * MIN_IN_SECS
  }

  return {
    id: payment_hash,
    bolt11: bolt11 || null,
    hash: payment_hash,
    direction: 'receive',
    type: 'payment_request',
    preimage: payment_preimage,
    value: formatMsat(amount_received_msat || amount_msat || 'any'),
    status: invoiceStatusToPaymentStatus(status),
    completedAt: paid_at ? new Date(paid_at * 1000).toISOString() : null,
    expiresAt: new Date(expires_at * 1000).toISOString(),
    description,
    destination: undefined,
    fee: null,
    startedAt: new Date(timestamp * 1000).toISOString(),
    payIndex: pay_index
  }
}

export function payToPayment(pay: Pay): Payment {
  const {
    bolt11,
    destination,
    payment_hash,
    status,
    created_at,
    preimage,
    amount_msat,
    amount_sent_msat
  } = pay

  const timestamp = new Date(created_at * 1000).toISOString()

  let description: string | undefined

  try {
    const decodedInvoice: DecodedInvoice | undefined = bolt11 && decode(bolt11)
    description = decodedInvoice && formatDecodedInvoice(decodedInvoice).description
  } catch (error) {
    logger.error(`Unable to decode bolt11: ${bolt11}`)
  }

  const amountMsat = formatMsat(amount_msat)

  return {
    id: payment_hash,
    destination,
    bolt11: bolt11 || null,
    status,
    startedAt: timestamp,
    hash: payment_hash,
    preimage,
    value: amountMsat,
    fee: Big(formatMsat(amount_sent_msat)).minus(amountMsat).toString(),
    direction: 'send',
    type: bolt11 ? 'payment_request' : 'node_public_key',
    expiresAt: null,
    completedAt: timestamp,
    description
  }
}
