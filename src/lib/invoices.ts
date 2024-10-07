import { BitcoinDenomination, FiatDenomination } from './@types/settings.js'
import decode from './bolt11.js'
import type { DecodedBolt11Invoice } from './@types/invoices.js'
import { formatMsatString } from './wallets/coreln/utils.js'
import { msatsToSats } from './conversion.js'
import { nowSeconds } from './utils.js'
import type {
  DecodedBolt12InvoiceRequest,
  DecodedBolt12Invoice,
  DecodedBolt12Offer,
  Bolt12ValidDecodeReponse,
  DecodeResponse
} from './wallets/coreln/types.js'
import { connections$ } from './streams.js'

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
  const connection = connections$.value?.find(connection => connection)

  console.log(`connection = `, connection)

  if (!connection?.rpc) {
    throw {
      key: 'connection_not_available',
      detail: {
        timestamp: nowSeconds(),
        message: 'Could not find CLN rpc to decode offer',
        context: 'Decoding offer'
      }
    }
  }

  const decoded = (await connection.rpc({
    method: 'decode',
    params: { string: bolt12 }
  })) as DecodeResponse

  if (!decoded.valid) {
    throw {
      key: 'invalid_invoice',
      detail: {
        timestamp: nowSeconds(),
        message: 'This offer is invalid',
        context: 'Decoding offer'
      }
    }
  }

  const {
    type,
    offer_id,
    offer_currency,
    offer_amount_msat,
    offer_description,
    offer_issuer,
    offer_issuer_id,
    offer_node_id,
    offer_absolute_expiry,
    offer_quantity_max
  } = decoded as Bolt12ValidDecodeReponse

  // Common data across all types
  const denomination: BitcoinDenomination.sats | FiatDenomination =
    (offer_currency?.toLowerCase() as FiatDenomination) || BitcoinDenomination.sats
  const quantityMax = offer_quantity_max
  let amount = msatsToSats(formatMsatString(offer_amount_msat))
  const receiverNodeId = offer_issuer_id || offer_node_id
  let id = offer_id
  let senderNodeId: string | undefined
  let createdAt: number | undefined
  let payerNote: string | undefined

  switch (type) {
    case 'bolt12 offer': {
      const { offer_id } = decoded as DecodedBolt12Offer
      id = offer_id

      break
    }

    case 'bolt12 invoice': {
      const {
        invoice_created_at,
        invreq_payer_note,
        invreq_payer_id,
        invoice_amount_msat,
        invreq_amount_msat
      } = decoded as DecodedBolt12Invoice

      senderNodeId = invreq_payer_id
      createdAt = invoice_created_at
      payerNote = invreq_payer_note
      amount = msatsToSats(formatMsatString(invoice_amount_msat || invreq_amount_msat))

      break
    }

    case 'bolt12 invoice_request': {
      const { invreq_amount_msat, invreq_payer_id, invreq_payer_note } =
        decoded as DecodedBolt12InvoiceRequest

      amount = msatsToSats(formatMsatString(invreq_amount_msat))
      senderNodeId = invreq_payer_id
      payerNote = invreq_payer_note

      break
    }

    default:
      throw {
        key: 'unknown_type',
        detail: {
          timestamp: nowSeconds(),
          message: `Unknown type: ${type}`,
          context: 'Decoding offer'
        }
      }
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
