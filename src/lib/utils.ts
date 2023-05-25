import type { DecodedInvoice, FormattedDecodedBolt11 } from './@types/payments.js'
import { decode as bolt11Decoder } from 'light-bolt11-decoder'
import { log$ } from './streams.js'
import type { Offer } from './@types/offers.js'
import { BitcoinDenomination, FiatDenomination } from './@types/settings.js'

import type {
  DecodedBolt12Invoice,
  DecodedBolt12InvoiceRequest,
  DecodedBolt12Offer,
  DecodedType
} from 'bolt12-decoder/@types/types.js'

/**Will strip the msat suffix from msat values if there */
export function formatMsat(val: string | number): string {
  if (!val) return '0'
  return typeof val === 'string' ? val.replace('msat', '') : val.toString()
}

/** return unix timestamp in seconds for now  */
export function nowSeconds() {
  return Math.round(Date.now() / 1000)
}

export function convertVersionNumber(version: string): number {
  const [withoutDash] = version.split('-')
  const withoutDots = withoutDash.replace('.', '')
  return Number(withoutDots)
}

export function decodeBolt11(bolt11: string): (FormattedDecodedBolt11 & { bolt11: string }) | null {
  // Remove prepended string if found
  if (bolt11.includes('lightning:')) {
    bolt11 = bolt11.replace('lightning:', '')
  }

  try {
    const { sections } = bolt11Decoder(bolt11) as DecodedInvoice

    const formatted = sections.reduce((acc, { name, value }) => {
      if (name && value) {
        acc[name] = value
      }

      return acc
    }, {} as FormattedDecodedBolt11)

    return { bolt11, ...formatted }
  } catch (error) {
    return null
  }
}

export function formatLog(type: 'INFO' | 'WARN' | 'ERROR', msg: string): string {
  return `[${type} - ${new Date().toLocaleTimeString()}]: ${msg}`
}

export const logger = {
  info: (msg: string) => log$.next(formatLog('INFO', msg)),
  warn: (msg: string) => log$.next(formatLog('WARN', msg)),
  error: (msg: string) => log$.next(formatLog('ERROR', msg))
}

export function decodedOfferTypeToOfferType(type: DecodedType): 'pay' | 'withdraw' {
  if (type === 'bolt12 invoice_request') {
    return 'withdraw'
  } else {
    return 'pay'
  }
}

export async function bolt12ToOffer(bolt12: string, offerId?: string): Promise<Offer> {
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

  const expiry = offer_absolute_expiry
  const description = offer_description
  const issuer = offer_issuer

  let denomination: BitcoinDenomination.msats | FiatDenomination
  let nodeId: string
  let quantityMax: number | undefined
  let amount: string
  let id = offerId || ''

  if (type === 'bolt12 invoice_request') {
    const { invreq_amount, invreq_payer_id, invreq_id } = decoded as DecodedBolt12InvoiceRequest
    denomination = BitcoinDenomination.msats
    amount = formatMsat(invreq_amount as string)
    nodeId = invreq_payer_id
    quantityMax = offer_quantity_max
    id = invreq_id
  } else {
    const { invreq_amount } = decoded as DecodedBolt12Invoice
    const { offer_id } = decoded as DecodedBolt12Offer
    denomination = (offer_currency?.toLowerCase() as FiatDenomination) || BitcoinDenomination.msats
    amount = formatMsat((offer_amount || invreq_amount) as string)
    nodeId = offer_node_id
    quantityMax = offer_quantity_max
    id = offer_id || id
  }

  return {
    id,
    bolt12,
    type: decodedOfferTypeToOfferType(type),
    expiry,
    description,
    issuer,
    denomination,
    amount,
    nodeId,
    quantityMax
  }
}

export function isBolt12Invoice(invoice: string): boolean {
  return invoice.toLowerCase().startsWith('lni')
}
