import { BitcoinDenomination, FiatDenomination } from './@types/settings.js'
import decode from './bolt11.js'
import type { DecodedBolt11Invoice } from './@types/invoices.js'
import type { Invoice, InvoiceRequest } from 'bolt12-decoder'
import { msatsToSats } from './conversion.js'
import { formatMsatString } from './wallets/coreln/utils.js'
import decoder from 'bolt12-decoder'

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
  // const { default: decoder } = await import('bolt12-decoder')
  const decoded = decoder.decode(bolt12)
  const { id, type, currency, amount, description, issuerId, issuer, absoluteExpiry, quantityMax } =
    decoded

  let denomination: BitcoinDenomination.sats | FiatDenomination
  let senderNodeId: string | undefined
  let receiverNodeId: string | undefined
  let createdAt: number | undefined
  let payerNote: string | undefined

  if (type === 'invoice_request') {
    const { payerId } = decoded as InvoiceRequest
    denomination = BitcoinDenomination.sats
    senderNodeId = payerId
    receiverNodeId = issuerId
    payerNote = decoded.payerNote
  } else {
    const {
      createdAt: invoiceCreatedAt,
      payerNote: invoicePayerNote,
      payerId,
      nodeId
    } = decoded as Invoice
    denomination = (currency?.toLowerCase() as FiatDenomination) || BitcoinDenomination.sats
    receiverNodeId = nodeId
    senderNodeId = payerId
    createdAt = invoiceCreatedAt
    payerNote = invoicePayerNote
  }

  return {
    offerId: id,
    type: decodedOfferTypeToOfferType(type),
    expiry: absoluteExpiry,
    description,
    issuer,
    denomination,
    amount: (amount && msatsToSats(formatMsatString(amount))) || 0,
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

export function decodedOfferTypeToOfferType(
  type: 'offer' | 'invoice_request' | 'invoice'
): 'pay' | 'withdraw' {
  if (type === 'invoice_request') {
    return 'withdraw'
  } else {
    return 'pay'
  }
}
