import { SvelteSubject } from '$lib/streams'
import lightning from '$lib/lightning'
import { BitcoinDenomination, FiatDenomination } from '$lib/types'
import { formatMsat } from '$lib/utils'
import type { FormattedDecodedOffer } from './types'

import type {
  DecodedBolt12Invoice,
  DecodedBolt12InvoiceRequest,
  DecodedBolt12Offer,
  OfferCommon
} from '$lib/backends'

export const decodedOffers$ = new SvelteSubject<
  Record<DecodedBolt12Offer['offer_id'], FormattedDecodedOffer>
>({})

export async function decodeOffer(offer: string): Promise<FormattedDecodedOffer> {
  const lnApi = lightning.getLn()

  const decoded: DecodedBolt12Offer | DecodedBolt12Invoice | DecodedBolt12InvoiceRequest =
    await lnApi.decode(offer)

  const {
    valid,
    type,
    offer_recurrence,
    offer_currency,
    offer_amount,
    offer_amount_msat,
    offer_description,
    offer_node_id,
    offer_issuer,
    offer_absolute_expiry,
    offer_quantity_max
  } = decoded

  const offerInvalid = !valid
  const offerType = type
  const offerExpiry = offer_absolute_expiry
  const recurrence = offer_recurrence
  const description = offer_description
  const issuer = offer_issuer

  let denomination: BitcoinDenomination.msats | FiatDenomination
  let amountMsat: string
  let nodeId: OfferCommon['offer_node_id']
  let quantityMax: OfferCommon['offer_quantity_max']

  if (offerType === 'bolt12 invoice_request') {
    const { invreq_amount_msat, invreq_payer_id } = decoded as DecodedBolt12InvoiceRequest
    denomination = BitcoinDenomination.msats
    amountMsat = formatMsat(invreq_amount_msat as string)
    nodeId = invreq_payer_id
    quantityMax = offer_quantity_max
  } else {
    const { invreq_amount_msat } = decoded as DecodedBolt12Invoice
    denomination = (offer_currency?.toLowerCase() as FiatDenomination) || BitcoinDenomination.msats
    amountMsat =
      offer_amount?.toString() || formatMsat((offer_amount_msat || invreq_amount_msat) as string)
    nodeId = offer_node_id
    quantityMax = offer_quantity_max
  }

  return {
    offerInvalid,
    offerType,
    offerExpiry,
    recurrence,
    description,
    issuer,
    denomination,
    amountMsat,
    nodeId,
    quantityMax
  }
}
