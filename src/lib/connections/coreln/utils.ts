import Big from 'big.js'
import type { Invoice } from '$lib/@types/invoices.js'
import { decodeBolt11, formatMsat, logger } from '$lib/utils'
import type { InvoiceStatus, Pay, RawInvoice } from './types'
import { State } from './types'
import type { DecodedBolt12Invoice } from 'bolt12-decoder/@types/types.js'
import type { ChannelStatus } from '$lib/@types/channels.js'

export function invoiceStatusToPaymentStatus(status: InvoiceStatus): Invoice['status'] {
  switch (status) {
    case 'paid':
      return 'complete'
    case 'unpaid':
      return 'pending'
    default:
      return 'expired'
  }
}

export async function formatInvoice(invoice: RawInvoice, connectionId: string): Promise<Invoice> {
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

  let timestamp: number = new Date().getTime() / 1000

  let offer: Invoice['offer']

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
      description: offer_description,
      payerNote: invreq_payer_note
    }
  }

  return {
    id: label || payment_hash,
    request: (bolt12 || bolt11) as string,
    hash: payment_hash,
    direction: 'receive',
    type: bolt12 ? 'bolt12' : 'bolt11',
    preimage: payment_preimage,
    value: formatMsat(amount_received_msat || amount_msat || 'any'),
    status: invoiceStatusToPaymentStatus(status),
    completedAt: paid_at ? paid_at : null,
    expiresAt: expires_at,
    description,
    destination: undefined,
    fee: null,
    startedAt: timestamp,
    payIndex: pay_index,
    offer,
    connectionId
  }
}

export async function payToPayment(pay: Pay, connectionId: string): Promise<Invoice> {
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

  const timestamp = created_at

  let description: string | undefined
  let offer: Invoice['offer']

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
    request: (bolt12 || bolt11) as string,
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
    offer,
    connectionId
  }
}

export function stateToChannelStatus(state: State): ChannelStatus {
  switch (state) {
    case State.Openingd:
      return 'OPENING'
    case State.ChanneldAwaitingLockin:
      return 'CHANNEL_AWAITING_LOCKIN'
    case State.ChanneldNormal:
      return 'CHANNEL_NORMAL'
    case State.ChanneldShuttingDown:
      return 'CHANNEL_SHUTTING_DOWN'
    case State.ClosingdSigexchange:
      return 'CLOSING_SIGEXCHANGE'
    case State.ClosingdComplete:
      return 'CLOSING_COMPLETE'
    case State.AwaitingUnilateral:
      return 'AWAITING_UNILATERAL'
    case State.FundingSpendSeen:
      return 'FUNDING_SPEND_SEEN'
    case State.Onchain:
      return 'ONCHAIN'
    case State.DualopendOpenInit:
      return 'DUALOPEN_OPEN_INIT'
    case State.DualopendAwaitingLockin:
      return 'DUALOPEN_AWAITING_LOCKIN'
  }
}
