import { BitcoinDenomination, FiatDenomination } from './@types/settings.js'
import decode from './bolt11.js'
import type { DecodedBolt11Invoice } from './@types/invoices.js'
import { formatMsatString } from './wallets/coreln/utils.js'
import { msatsToSats } from './conversion.js'

import type {
  DecodedBolt12Invoice,
  DecodedBolt12InvoiceRequest,
  DecodedBolt12Offer,
  DecodedType
} from 'bolt12-decoder/@types/types.js'

export function decodeBolt11(bolt11: string): DecodedBolt11Invoice | null {
  bolt11 = bolt11.toLowerCase()

  // Remove prepended string if found
  if (bolt11.includes('lightning:')) {
    bolt11 = bolt11.replace('lightning:', '')
  }

  try {
    const decoded = decode(bolt11)

    return decoded
  } catch (error) {
    return null
  }
}

export const decodeBolt12 = async (bolt12: string) => {
  const { default: decoder } = await import('bolt12-decoder')
  const decoded = decoder(bolt12)

  const {
    type,
    offer_currency,
    offer_amount,
    offer_description,
    offer_node_id,
    offer_issuer,
    offer_absolute_expiry,
    offer_quantity_max
  } = decoded

  let denomination: BitcoinDenomination.sats | FiatDenomination
  let quantityMax: number | undefined
  let amount: number
  let id: string
  let senderNodeId: string | undefined
  let receiverNodeId: string | undefined
  let createdAt: number | undefined
  let payerNote: string | undefined

  if (type === 'bolt12 invoice_request') {
    const { invreq_amount, invreq_payer_id, invreq_id, invoice_created_at, invreq_payer_note } =
      decoded as DecodedBolt12InvoiceRequest
    denomination = BitcoinDenomination.sats
    amount = msatsToSats(formatMsatString(invreq_amount))
    senderNodeId = invreq_payer_id
    receiverNodeId = offer_node_id
    quantityMax = offer_quantity_max
    id = invreq_id
    createdAt = invoice_created_at
    payerNote = invreq_payer_note
  } else {
    const {
      invreq_amount,
      invoice_node_id,
      invoice_created_at,
      invreq_payer_note,
      invreq_payer_id
    } = decoded as DecodedBolt12Invoice
    const { offer_id } = decoded as DecodedBolt12Offer
    denomination = (offer_currency?.toLowerCase() as FiatDenomination) || BitcoinDenomination.sats
    amount = msatsToSats(formatMsatString(offer_amount || invreq_amount))
    receiverNodeId = offer_node_id || invoice_node_id
    senderNodeId = invreq_payer_id
    quantityMax = offer_quantity_max
    id = offer_id
    createdAt = invoice_created_at
    payerNote = invreq_payer_note
  }

  return {
    offerId: id,
    type: decodedOfferTypeToOfferType(type),
    expiry: offer_absolute_expiry,
    description: offer_description,
    issuer: offer_issuer,
    denomination,
    amount,
    senderNodeId,
    receiverNodeId,
    quantityMax,
    createdAt,
    payerNote
  }
}

export function isBolt12Invoice(invoice: string): boolean {
  return invoice.toLowerCase().startsWith('lni')
}

export function decodedOfferTypeToOfferType(type: DecodedType): 'pay' | 'withdraw' {
  if (type === 'bolt12 invoice_request') {
    return 'withdraw'
  } else {
    return 'pay'
  }
}
