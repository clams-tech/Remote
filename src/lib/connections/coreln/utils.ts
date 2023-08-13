import Big from 'big.js'
import type { Invoice } from '$lib/@types/invoices.js'
import type { InvoiceStatus, Pay, RawInvoice } from './types'
import { State } from './types'
import type { DecodedBolt12Invoice } from 'bolt12-decoder/@types/types.js'
import type { ChannelStatus } from '$lib/@types/channels.js'
import { decodeBolt11 } from '$lib/invoices.js'
import { log } from '$lib/services.js'

/**Will strip the msat suffix from msat values if there */
export function stripMsatSuffix(val: string | number | undefined): string {
  if (!val) return '0'
  return typeof val === 'string' ? val.replace('msat', '') : val.toString()
}

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

  let createdAt: number = new Date().getTime() / 1000
  let nodeId = ''

  let offer: Invoice['offer']

  if (bolt11) {
    const decoded = decodeBolt11(bolt11)

    if (decoded) {
      createdAt = decoded.createdAt || Date.now() / 1000
      nodeId = decoded.nodeId
    } else {
      log.error(`Unable to decode bolt11: ${bolt11}`)
    }
  }

  if (bolt12) {
    const { default: decodeBolt12 } = await import('bolt12-decoder')
    const decoded = decodeBolt12(bolt12)

    const {
      invoice_created_at,
      offer_issuer,
      offer_description,
      invreq_payer_note,
      offer_node_id
    } = decoded as DecodedBolt12Invoice

    createdAt = invoice_created_at || Date.now() / 1000
    nodeId = offer_node_id

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
    amount: stripMsatSuffix(amount_received_msat || amount_msat || 'any'),
    status: invoiceStatusToPaymentStatus(status),
    completedAt: paid_at ? paid_at : undefined,
    expiresAt: expires_at,
    description: description.replace('keysend: ', ''),
    nodeId,
    fee: undefined,
    createdAt,
    payIndex: pay_index,
    offer,
    connectionId
  }
}

export async function payToInvoice(pay: Pay, connectionId: string): Promise<Invoice> {
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

  const timestamp = created_at || Date.now() / 1000

  let description: string | undefined
  let offer: Invoice['offer']
  let nodeId = destination as string

  if (bolt11) {
    const decoded = decodeBolt11(bolt11)

    if (decoded) {
      description = decoded.description
      nodeId = decoded.nodeId
    } else {
      log.error(`Unable to decode bolt11: ${bolt11}`)
    }
  }

  if (bolt12) {
    const { default: decodeBolt12 } = await import('bolt12-decoder')
    const decoded = decodeBolt12(bolt12)

    const { offer_issuer, offer_description, invreq_payer_note, offer_node_id } =
      decoded as DecodedBolt12Invoice

    nodeId = offer_node_id

    offer = {
      issuer: offer_issuer,
      payerNote: invreq_payer_note,
      description: offer_description
    }
  }

  const amount = stripMsatSuffix(amount_msat)

  return {
    id: label || payment_hash,
    nodeId,
    request: (bolt12 || bolt11) as string,
    status,
    createdAt: timestamp,
    hash: payment_hash,
    preimage,
    amount,
    fee: Big(stripMsatSuffix(amount_sent_msat)).minus(amount).toString(),
    direction: 'send',
    type: bolt11 ? 'bolt11' : 'keysend',
    expiresAt: undefined,
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

export function convertVersionNumber(version: string): number {
  const [withoutDash] = version.split('-')
  const withoutDots = withoutDash.replace('.', '')
  return Number(withoutDots)
}
