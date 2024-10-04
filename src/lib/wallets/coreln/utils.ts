import Big from 'big.js'
import type { InvoiceStatus, Pay, RawInvoice } from './types'
import { State } from './types'
import type { ChannelStatus } from '$lib/@types/channels.js'
import { decodeBolt11, decodeBolt12 } from '$lib/invoices.js'
import { log } from '$lib/services.js'
import { msatsToSats } from '$lib/conversion.js'
import { nowSeconds } from '$lib/utils.js'
import type { InvoicePayment, Network, Payment } from '$lib/@types/payments.js'
import type { Connection } from '../interfaces'

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
): Payment['status'] {
  const expired = nowSeconds() >= expiresAt

  switch (status) {
    case 'paid':
      return 'complete'
    case 'unpaid':
      return expired ? 'expired' : 'waiting'
    default:
      return 'expired'
  }
}

export async function formatInvoice(
  invoice: RawInvoice,
  connection: Connection,
  walletId: string,
  network: Network
): Promise<InvoicePayment> {
  const {
    bolt11,
    bolt12,
    payment_hash,
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
  let nodeId: string | undefined

  let offer: InvoicePayment['data']['offer']

  if (bolt11) {
    const decoded = decodeBolt11(bolt11)

    if (decoded) {
      createdAt = decoded.createdAt || Date.now() / 1000
    } else {
      log.error(`Unable to decode bolt11: ${bolt11}`)
    }
  }

  if (bolt12) {
    const decoded = await decodeBolt12(connection, bolt12)

    const {
      createdAt: invoiceCreatedAt,
      senderNodeId,
      issuer,
      description,
      payerNote,
      offerId
    } = decoded

    createdAt = invoiceCreatedAt as number
    nodeId = senderNodeId

    offer = {
      id: offerId || local_offer_id,
      issuer,
      description,
      payerNote
    }
  }

  return {
    id: payment_hash,
    status: invoiceStatusToPaymentStatus(status, expires_at),
    timestamp: paid_at || createdAt,
    network,
    walletId,
    type: 'invoice',
    data: {
      direction: 'receive',
      type: bolt12 ? 'bolt12' : 'bolt11',
      request: (bolt12 || bolt11) as string,
      preimage: payment_preimage,
      amount: msatsToSats(formatMsatString(amount_received_msat || amount_msat || 'any')),
      completedAt: paid_at ? paid_at : undefined,
      expiresAt: expires_at,
      description: description.replace('keysend: ', ''),
      counterpartyNode: nodeId,
      fee: undefined,
      createdAt,
      payIndex: pay_index,
      offer
    }
  }
}

export async function payToInvoice(
  pay: Pay,
  walletId: string,
  network: Network
): Promise<InvoicePayment> {
  const {
    bolt11,
    bolt12,
    destination,
    payment_hash,
    status,
    created_at,
    preimage,
    amount_msat,
    amount_sent_msat
  } = pay

  const timestamp = created_at || Date.now() / 1000

  let description: string | undefined
  let offer: InvoicePayment['data']['offer']
  let nodeId = destination

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
    const { receiverNodeId, issuer, description, payerNote } = await decodeBolt12(bolt12)

    nodeId = receiverNodeId

    offer = {
      issuer,
      payerNote,
      description
    }
  }

  const amount = formatMsatString(amount_msat)

  return {
    id: payment_hash,
    status,
    timestamp,
    walletId,
    network,
    type: 'invoice',
    data: {
      direction: 'send',
      counterpartyNode: nodeId,
      request: (bolt12 || bolt11) as string,
      createdAt: timestamp,
      preimage,
      amount: msatsToSats(amount),
      fee: msatsToSats(Big(formatMsatString(amount_sent_msat)).minus(amount).toString()),
      type: bolt11 ? 'bolt11' : bolt12 ? 'bolt12' : 'keysend',
      expiresAt: undefined,
      completedAt: timestamp,
      description,
      offer
    }
  }
}

export function stateToChannelStatus(
  stateChanges:
    | {
        timestamp: string
        old_state: State
        new_state: State
        cause: string
        message: string
      }[]
    | State
): ChannelStatus {
  if (typeof stateChanges === 'string') {
    switch (stateChanges) {
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
  } else {
    const [mostRecentStateChange, previousStateChange] = stateChanges.reverse()

    switch (mostRecentStateChange.new_state) {
      case State.Openingd:
      case State.ChanneldAwaitingLockin:
      case State.DualopendOpenInit:
      case State.DualopendAwaitingLockin:
        return 'opening'
      case State.ChanneldNormal:
        return 'active'
      case State.ChanneldShuttingDown:
      case State.ClosingdSigexchange:
      case State.AwaitingUnilateral:
        return 'closing'
      case State.FundingSpendSeen: {
        if (mostRecentStateChange.old_state === State.ClosingdComplete) {
          return 'closed'
        } else {
          return 'force_closed'
        }
      }
      case State.Onchain: {
        if (previousStateChange) {
          const { old_state } = previousStateChange

          if (old_state === State.ClosingdComplete) {
            return 'closed'
          } else {
            return 'force_closed'
          }
        } else {
          return 'closed'
        }
      }
      case State.ClosingdComplete:
        return 'closed'
    }
  }
}

export function convertVersionNumber(version: string): number {
  version = version.toLowerCase()
  version = version.replace('v', '')
  const [withoutDash] = version.split('-')
  const withoutDots = withoutDash.replace('.', '')
  const slicedToMajorVersion = withoutDots.slice(0, 4)
  return Number(slicedToMajorVersion)
}
