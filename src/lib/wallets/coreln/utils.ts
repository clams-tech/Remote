import Big from 'big.js'
import type { Invoice } from '$lib/@types/invoices.js'
import type { InvoiceStatus, Pay, RawInvoice } from './types'
import { State } from './types'
import type { DecodedBolt12Invoice } from 'bolt12-decoder/@types/types.js'
import type { ChannelStatus } from '$lib/@types/channels.js'
import { decodeBolt11 } from '$lib/invoices.js'
import { log } from '$lib/services.js'
import { msatsToSats } from '$lib/conversion.js'
import { nowSeconds } from '$lib/utils.js'

/**Will strip the msat suffix from msat values if there and also convert 'any' to 0 */
export function formatMsatString(val: string | number | undefined): string {
  let msat = '0'

  if (!val || val === 'any') {
    msat = '0'
  } else if (typeof val === 'string') {
    msat = val.replace('msat', '')
  } else if (typeof val === 'number') {
    msat = val.toString()
  }

  return msat
}

export function invoiceStatusToPaymentStatus(
  status: InvoiceStatus,
  expiresAt: number
): Invoice['status'] {
  const expired = nowSeconds() >= expiresAt

  switch (status) {
    case 'paid':
      return 'complete'
    case 'unpaid':
      return expired ? 'expired' : 'pending'
    default:
      return 'expired'
  }
}

export async function formatInvoice(invoice: RawInvoice, walletId: string): Promise<Invoice> {
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
    local_offer_id,
    payer_note
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
      invreq_payer_id,
      invoice_node_id,
      offer_node_id
    } = decoded as DecodedBolt12Invoice

    createdAt = invoice_created_at || Date.now() / 1000
    nodeId = invreq_payer_id || (invoice_node_id as string) || offer_node_id

    offer = {
      id: local_offer_id,
      issuer: offer_issuer,
      description: offer_description,
      payerNote: invreq_payer_note || payer_note
    }
  }

  return {
    id: label || payment_hash,
    request: (bolt12 || bolt11) as string,
    hash: payment_hash,
    direction: 'receive',
    type: bolt12 ? 'bolt12' : 'bolt11',
    preimage: payment_preimage,
    amount: msatsToSats(formatMsatString(amount_received_msat || amount_msat || 'any')),
    status: invoiceStatusToPaymentStatus(status, expires_at),
    completedAt: paid_at ? paid_at : undefined,
    expiresAt: expires_at,
    description: description.replace('keysend: ', ''),
    nodeId,
    fee: undefined,
    createdAt,
    payIndex: pay_index,
    offer,
    walletId
  }
}

export async function payToInvoice(pay: Pay, walletId: string): Promise<Invoice> {
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
      description = decoded.description || undefined
      nodeId = decoded.nodeId
    } else {
      log.error(`Unable to decode bolt11: ${bolt11}`)
    }
  }

  if (bolt12) {
    const { default: decodeBolt12 } = await import('bolt12-decoder')
    const decoded = decodeBolt12(bolt12)

    const { offer_issuer, offer_description, invreq_payer_note, offer_node_id, invreq_payer_id } =
      decoded as DecodedBolt12Invoice

    nodeId = offer_node_id || invreq_payer_id

    offer = {
      issuer: offer_issuer,
      payerNote: invreq_payer_note,
      description: offer_description
    }
  }

  const amount = formatMsatString(amount_msat)

  return {
    id: label || payment_hash,
    nodeId,
    request: (bolt12 || bolt11) as string,
    status,
    createdAt: timestamp,
    hash: payment_hash,
    preimage,
    amount: msatsToSats(amount),
    fee: msatsToSats(Big(formatMsatString(amount_sent_msat)).minus(amount).toString()),
    direction: 'send',
    type: bolt11 ? 'bolt11' : bolt12 ? 'bolt12' : 'keysend',
    expiresAt: undefined,
    completedAt: timestamp,
    description,
    offer,
    walletId
  }
}

export function stateToChannelStatus(state: State): ChannelStatus {
  switch (state) {
    case State.Openingd:
    case State.ChanneldAwaitingLockin:
    case State.FundingSpendSeen:
    case State.DualopendOpenInit:
    case State.DualopendAwaitingLockin:
      return 'opening'
    case State.ChanneldNormal:
      return 'active'
    case State.ChanneldShuttingDown:
    case State.ClosingdSigexchange:
    case State.AwaitingUnilateral:
      return 'closing'
    case State.Onchain:
      return 'force_closed'
    case State.ClosingdComplete:
      return 'closed'
  }
}

export function convertVersionNumber(version: string): number {
  const [withoutDash] = version.split('-')
  const withoutDots = withoutDash.replace('.', '')
  return Number(withoutDots)
}
