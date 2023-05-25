import type { CreatePayOfferOptions, Offer } from '$lib/@types/offers.js'
import { bolt12ToOffer, formatMsat, nowSeconds } from '$lib/utils.js'
import type { Payment } from '$lib/@types/payments.js'
import { invoiceStatusToPaymentStatus } from './utils.js'
import type { Node } from '$lib/@types/nodes.js'
import type { OffersInterface } from '$lib/@types/connections.js'
import { BitcoinDenomination } from '$lib/@types/settings.js'

import type {
  CreatePayOfferResponse,
  CreateWithdrawOfferResponse,
  FetchInvoiceResponse,
  InvoiceRequestSummary,
  InvoiceStatus,
  ListInvoiceRequestsResponse,
  ListOffersResponse,
  OfferSummary,
  RpcCall,
  SendInvoiceResponse
} from './types.js'

const offers: (rpc: RpcCall, node: Node) => OffersInterface = (rpc, node) => {
  /** Get all offers and invoice requests */
  const get = async (): Promise<Offer[]> => {
    const [offersResponse, invoiceRequestsResponse] = await Promise.all([
      rpc({ method: 'listoffers' }),
      rpc({ method: 'listinvoicerequests' })
    ])

    const { offers } = offersResponse as ListOffersResponse
    const { invoicerequests } = invoiceRequestsResponse as ListInvoiceRequestsResponse

    const formatted = [...offers, ...invoicerequests].map(async (offer) => {
      const { offer_id, bolt12, active, single_use, used, label } = offer as OfferSummary
      const { invreq_id } = offer as InvoiceRequestSummary
      const formattedOffer = await bolt12ToOffer(bolt12, offer_id || invreq_id)

      return {
        ...formattedOffer,
        active,
        single_use,
        used,
        bolt12,
        label
      }
    })

    return Promise.all(formatted)
  }

  /** Create a pay type offer */
  const createPay = async (options: CreatePayOfferOptions): Promise<Offer> => {
    const { amount, description, issuer, label, quantityMax, expiry, singleUse } = options

    const result = await rpc({
      method: 'offer',
      params: {
        amount,
        description,
        issuer,
        label,
        quantity_max: quantityMax,
        absolute_expiry: expiry,
        single_use: singleUse
      }
    })

    const { offer_id, bolt12, used, single_use, active } = result as CreatePayOfferResponse

    return {
      id: offer_id,
      bolt12,
      type: 'pay',
      denomination: BitcoinDenomination.msats,
      amount,
      description,
      nodeId: node.id,
      used,
      singleUse: single_use,
      active,
      label,
      expiry,
      issuer,
      quantityMax
    }
  }

  /** Disable a pay type offer */
  const disablePay = async (offerId: string): Promise<OfferSummary> => {
    const result = await rpc({ method: 'disableoffer', params: { offer_id: offerId } })
    return result as OfferSummary
  }

  /** Create a withdraw type offer */
  const createWithdraw = async (
    params: CreateWithdrawOfferRequest['params']
  ): Promise<CreateWithdrawOfferResponse> => {
    const result = await rpc({ method: 'invoicerequest', params })
    return result as CreateWithdrawOfferResponse
  }

  /** Disable a withdraw type offer */
  const disableWithdraw = async (
    params: DisableInvoiceRequestRequest['params']
  ): Promise<InvoiceRequestSummary> => {
    const result = await rpc({ method: 'disableinvoicerequest', params })
    return result as InvoiceRequestSummary
  }

  /** Fetch an invoice for a BOLT12 Offer */
  const fetchInvoice = async (
    params: FetchInvoiceRequest['params']
  ): Promise<FetchInvoiceResponse> => {
    const result = await rpc({ method: 'fetchinvoice', params })

    return result as FetchInvoiceResponse
  }

  /** Create an invoice for a BOLT12 Offer and send it to be paid */
  const sendInvoice = async (params: SendInvoiceRequest['params']): Promise<Payment> => {
    const { offer, label, amount_msat, timeout, quantity } = params
    const createdAt = nowSeconds()

    const orderedParams = amount_msat
      ? [offer, label, amount_msat, timeout, quantity]
      : [offer, label, timeout, quantity]

    const result = await rpc({ method: 'sendinvoice', params: orderedParams })

    const {
      payment_hash,
      payment_preimage,
      status,
      bolt12,
      expires_at,
      paid_at,
      amount_received_msat,
      pay_index
    } = result as SendInvoiceResponse

    return {
      id: label,
      hash: payment_hash,
      preimage: payment_preimage,
      type: 'bolt12',
      direction: 'receive',
      value: formatMsat((amount_received_msat || amount_msat) as string),
      completedAt: paid_at ? paid_at : nowSeconds(),
      expiresAt: expires_at,
      startedAt: createdAt,
      fee: null,
      status: invoiceStatusToPaymentStatus(status as InvoiceStatus),
      invoice: bolt12,
      payIndex: pay_index,
      nodeId: node.id
    }
  }

  return {
    get,
    createPay,
    disablePay,
    createWithdraw,
    disableWithdraw,
    fetchInvoice,
    sendInvoice
  }
}

export default offers
