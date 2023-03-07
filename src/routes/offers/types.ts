import type { DecodedCommon, OfferCommon } from '$lib/backends'
import type { BitcoinDenomination, FiatDenomination } from '$lib/types'

export type FormattedDecodedOffer = {
  offerInvalid: DecodedCommon['valid']
  offerType: DecodedCommon['type']
  offerExpiry: OfferCommon['offer_absolute_expiry']
  recurrence: OfferCommon['offer_recurrence']
  description: OfferCommon['offer_description']
  issuer: OfferCommon['offer_issuer']
  denomination: BitcoinDenomination.msats | FiatDenomination
  amountMsat: string
  nodeId: OfferCommon['offer_node_id']
  quantityMax: OfferCommon['offer_quantity_max']
}
