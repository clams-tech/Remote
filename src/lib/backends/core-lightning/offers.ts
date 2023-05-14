import type { Offer } from '$lib/@types/offers.js'
import type {
  CreatePayOfferRequest,
  CreatePayOfferResponse,
  CreateWithdrawOfferRequest,
  CreateWithdrawOfferResponse,
  DisableInvoiceRequestRequest,
  DisableOfferRequest,
  FetchInvoiceRequest,
  FetchInvoiceResponse,
  InvoiceRequestSummary,
  InvoiceStatus,
  ListInvoiceRequestsResponse,
  ListOffersResponse,
  OfferSummary,
  RpcCall,
  SendInvoiceRequest,
  SendInvoiceResponse
} from './types.js'
import bolt12Decoder from 'bolt12-decoder'
import { formatDecodedOffer, formatMsat, now } from '$lib/utils.js'
import type { DecodedType } from 'bolt12-decoder/@types/types.js'
import type { Payment } from '$lib/@types/payments.js'
import { invoiceStatusToPaymentStatus } from './utils.js'
import type { Node } from '$lib/@types/nodes.js'

const offers = (rpc: RpcCall, node: Node) => {
  /** Get all offers and invoice requests */
  const get = async (): Promise<Offer[]> => {
    const [offersResponse, invoiceRequestsResponse] = await Promise.all([
      rpc({ method: 'listoffers' }),
      rpc({ method: 'listinvoicerequests' })
    ])

    const { offers } = offersResponse as ListOffersResponse
    const { invoicerequests } = invoiceRequestsResponse as ListInvoiceRequestsResponse

    const formatted = [...offers, ...invoicerequests].map((offer) => {
      const { offer_id, bolt12, active, single_use, used, label } = offer as OfferSummary
      const { invreq_id } = offer as InvoiceRequestSummary
      const decoded = bolt12Decoder(bolt12)
      const formatted = formatDecodedOffer({ ...decoded, valid: true, offer_id })

      return {
        ...formatted,
        active,
        single_use,
        used,
        bolt12,
        label,
        id: offer_id || invreq_id,
        type: (offer_id ? 'pay' : 'withdraw') as DecodedType
      }
    })

    return formatted
  }

  /** Create a pay type offer */
  const createPay = async (
    params: CreatePayOfferRequest['params']
  ): Promise<CreatePayOfferResponse> => {
    const result = await rpc({ method: 'offer', params })
    return result as CreatePayOfferResponse
  }

  /** Disable a pay type offer */
  const disablePay = async (params: DisableOfferRequest['params']): Promise<OfferSummary> => {
    const result = await rpc({ method: 'disableoffer', params })
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
    const createdAt = now()

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
      completedAt: paid_at ? paid_at : now(),
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
