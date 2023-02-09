import Big from 'big.js'
import type { Payment } from '$lib/types'
import { decodeBolt11, formatMsat, logger } from '$lib/utils'
import type { InvoiceStatus, Invoice, Pay } from './types'

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
    label,
    amount_received_msat,
    amount_msat,
    status,
    paid_at,
    payment_preimage,
    description,
    expires_at,
    pay_index
  } = invoice

  let timestamp: number | null = new Date().getTime() / 1000

  if (bolt11) {
    const decoded = decodeBolt11(bolt11)

    if (decoded) {
      timestamp = decoded.timestamp
    } else {
      logger.error(`Unable to decode bolt11: ${bolt11}`)
    }
  }

  return {
    id: label || payment_hash,
    bolt11: bolt11 || null,
    hash: payment_hash,
    direction: 'receive',
    type: 'bolt11',
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
    label,
    payment_hash,
    status,
    created_at,
    preimage,
    amount_msat,
    amount_sent_msat
  } = pay

  const timestamp = new Date(created_at * 1000).toISOString()

  let description: string | undefined

  if (bolt11) {
    const decoded = decodeBolt11(bolt11)

    if (decoded) {
      description = decoded.description
    } else {
      logger.error(`Unable to decode bolt11: ${bolt11}`)
    }
  }

  const amountMsat = formatMsat(amount_msat)

  return {
    id: label || payment_hash,
    destination,
    bolt11: bolt11 || null,
    status,
    startedAt: timestamp,
    hash: payment_hash,
    preimage,
    value: amountMsat,
    fee: Big(formatMsat(amount_sent_msat)).minus(amountMsat).toString(),
    direction: 'send',
    type: bolt11 ? 'bolt11' : 'keysend',
    expiresAt: null,
    completedAt: timestamp,
    description
  }
}
