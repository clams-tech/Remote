import Big from 'big.js'
import type { Payment } from '$lib/types'
import { decodeBolt11, formatMsat, logger } from '$lib/utils'

import type {
  InvoiceStatus,
  Invoice,
  Pay,
  ChannelAPY,
  IncomeEvent,
  DecodedBolt12Invoice
} from './types'
import { nodeInfo$, offers$ } from '$lib/streams'

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

export async function invoiceToPayment(invoice: Invoice): Promise<Payment> {
  const {
    bolt11,
    bolt12,
    payment_hash,
    label,
    amount_received_msat,
    amount_msat,
    status,
    paid_at,
    payment_preimage,
    description,
    expires_at,
    pay_index,
    local_offer_id
  } = invoice

  let timestamp: number | null = new Date().getTime() / 1000

  let offer: Payment['offer']

  if (bolt11) {
    const decoded = decodeBolt11(bolt11)

    if (decoded) {
      timestamp = decoded.timestamp
    } else {
      logger.error(`Unable to decode bolt11: ${bolt11}`)
    }
  }

  if (bolt12) {
    const { default: decodeBolt12 } = await import('bolt12-decoder')
    const decoded = decodeBolt12(bolt12)

    const { invoice_created_at, offer_issuer, offer_description, invreq_payer_note } =
      decoded as DecodedBolt12Invoice

    timestamp = invoice_created_at

    offer = {
      id: local_offer_id,
      issuer: offer_issuer,
      payerNote: invreq_payer_note,
      description: offer_description
    }
  }

  return {
    id: label || payment_hash,
    invoice: bolt12 || bolt11,
    hash: payment_hash,
    direction: 'receive',
    type: bolt12 ? 'bolt12' : 'bolt11',
    preimage: payment_preimage,
    value: formatMsat(amount_received_msat || amount_msat || 'any'),
    status: invoiceStatusToPaymentStatus(status),
    completedAt: paid_at ? new Date(paid_at * 1000).toISOString() : null,
    expiresAt: new Date(expires_at * 1000).toISOString(),
    description,
    destination: undefined,
    fee: null,
    startedAt: new Date(timestamp * 1000).toISOString(),
    payIndex: pay_index,
    offer
  }
}

export async function payToPayment(pay: Pay): Promise<Payment> {
  const {
    bolt11,
    bolt12,
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
  let offer: Payment['offer']

  if (bolt11) {
    const decoded = decodeBolt11(bolt11)

    if (decoded) {
      description = decoded.description
    } else {
      logger.error(`Unable to decode bolt11: ${bolt11}`)
    }
  }

  if (bolt12) {
    const { default: decodeBolt12 } = await import('bolt12-decoder')
    const decoded = decodeBolt12(bolt12)

    const { offer_issuer, offer_description, invreq_payer_note, invreq_payer_id } =
      decoded as DecodedBolt12Invoice

    offer = {
      issuer: offer_issuer,
      payerNote: invreq_payer_note,
      payerId: invreq_payer_id,
      description: offer_description
    }
  }

  const amountMsat = formatMsat(amount_msat)

  return {
    id: label || payment_hash,
    destination,
    invoice: bolt12 || bolt11,
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
    description,
    offer
  }
}

export function formatIncomeEvents(events: IncomeEvent[]): IncomeEvent[] {
  return events.map(({ credit_msat, debit_msat, ...rest }) => ({
    ...rest,
    credit_msat: formatMsat(credit_msat),
    debit_msat: formatMsat(debit_msat)
  }))
}

export function formatChannelsAPY(channels: ChannelAPY[]): ChannelAPY[] {
  return channels.map(
    ({
      routed_out_msat,
      routed_in_msat,
      lease_fee_paid_msat,
      lease_fee_earned_msat,
      pushed_out_msat,
      pushed_in_msat,
      our_start_balance_msat,
      channel_start_balance_msat,
      fees_out_msat,
      fees_in_msat,
      ...rest
    }) => ({
      ...rest,
      routed_out_msat: formatMsat(routed_out_msat),
      routed_in_msat: formatMsat(routed_in_msat),
      lease_fee_paid_msat: formatMsat(lease_fee_paid_msat),
      lease_fee_earned_msat: formatMsat(lease_fee_earned_msat),
      pushed_out_msat: formatMsat(pushed_out_msat),
      pushed_in_msat: formatMsat(pushed_in_msat),
      our_start_balance_msat: formatMsat(our_start_balance_msat),
      channel_start_balance_msat: formatMsat(channel_start_balance_msat),
      fees_out_msat: formatMsat(fees_out_msat),
      fees_in_msat: formatMsat(fees_in_msat)
    })
  )
}
