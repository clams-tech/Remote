import LnMessage from 'lnmessage'
import Big from 'big.js'
import type { Auth, Payment } from '$lib/types'
import { formatMsat, parseNodeAddress, sortPaymentsMostRecent } from '$lib/utils'
import type { Logger } from 'lnmessage/dist/types'
import { settings$ } from '$lib/streams'

import {
  formatChannelsAPY,
  formatIncomeEvents,
  invoiceStatusToPaymentStatus,
  invoiceToPayment,
  payToPayment
} from './utils'

import type {
  BkprChannelsAPYResponse,
  BkprListIncomeResponse,
  ChannelAPY,
  CreatePayOfferRequest,
  CreatePayOfferResponse,
  CreateWithdrawOfferRequest,
  CreateWithdrawOfferResponse,
  DisableInvoiceRequestRequest,
  DisableOfferRequest,
  FetchInvoiceRequest,
  FetchInvoiceResponse,
  GetinfoResponse,
  IncomeEvent,
  InvoiceRequest,
  InvoiceRequestSummary,
  InvoiceResponse,
  InvoiceStatus,
  KeysendResponse,
  ListfundsResponse,
  ListInvoiceRequestsResponse,
  ListinvoicesResponse,
  ListNodesResponse,
  ListOffersResponse,
  ListpaysResponse,
  OfferSummary,
  PayResponse,
  SendInvoiceRequest,
  SendInvoiceResponse,
  SignMessageResponse,
  WaitAnyInvoiceResponse,
  WaitInvoiceResponse
} from './types'

class CoreLn {
  public connection: LnMessage
  public rune: string

  constructor(auth: Auth, logger?: Logger) {
    const { address, token, sessionSecret } = auth
    const { wsProxy, directConnection } = settings$.value
    const { publicKey, ip, port } = parseNodeAddress(address)

    this.connection = new LnMessage({
      remoteNodePublicKey: publicKey,
      wsProxy: directConnection ? undefined : wsProxy,
      wsProtocol: directConnection,
      ip,
      port: port || 9735,
      privateKey: sessionSecret,
      logger: logger
    })

    this.rune = token
  }

  setToken(token: string) {
    this.rune = token
  }

  async connect() {
    return this.connection.connect()
  }

  disconnect() {
    return this.connection.disconnect()
  }

  async getInfo(): Promise<GetinfoResponse> {
    const result = await this.connection.commando({ method: 'getinfo', rune: this.rune })
    return result as GetinfoResponse
  }

  async createInvoice(params: InvoiceRequest['params']): Promise<Payment> {
    const { label, amount_msat, description } = params
    const startedAt = new Date().toISOString()

    const result = await this.connection.commando({
      method: 'invoice',
      params,
      rune: this.rune
    })

    const { bolt11, expires_at, payment_hash, payment_secret } = result as InvoiceResponse

    const payment: Payment = {
      id: label,
      status: 'pending',
      direction: 'receive',
      value: amount_msat,
      fee: null,
      type: 'bolt11',
      startedAt,
      completedAt: null,
      expiresAt: new Date(expires_at * 1000).toISOString(),
      invoice: bolt11,
      description,
      hash: payment_hash,
      preimage: payment_secret
    }

    return payment
  }

  async createPayOffer(params: CreatePayOfferRequest['params']): Promise<CreatePayOfferResponse> {
    const result = await this.connection.commando({
      method: 'offer',
      params,
      rune: this.rune
    })

    return result as CreatePayOfferResponse
  }

  async createWithdrawOffer(
    params: CreateWithdrawOfferRequest['params']
  ): Promise<CreateWithdrawOfferResponse> {
    const result = await this.connection.commando({
      method: 'invoicerequest',
      params,
      rune: this.rune
    })

    return result as CreateWithdrawOfferResponse
  }

  async disableOffer(params: DisableOfferRequest['params']): Promise<OfferSummary> {
    const result = await this.connection.commando({
      method: 'disableoffer',
      params,
      rune: this.rune
    })

    return result as OfferSummary
  }

  async disableInvoiceRequest(
    params: DisableInvoiceRequestRequest['params']
  ): Promise<InvoiceRequestSummary> {
    const result = await this.connection.commando({
      method: 'disableinvoicerequest',
      params,
      rune: this.rune
    })

    return result as InvoiceRequestSummary
  }

  async waitForInvoicePayment(payment: Payment): Promise<Payment> {
    const { id } = payment

    const result = await this.connection.commando({
      method: 'waitinvoice',
      params: {
        label: id
      },
      rune: this.rune
    })

    const { status, amount_received_msat, paid_at, payment_preimage } =
      result as WaitInvoiceResponse

    return {
      ...payment,
      status: status === 'paid' ? 'complete' : 'expired',
      value: formatMsat(amount_received_msat || payment.value),
      completedAt: new Date((paid_at as number) * 1000).toISOString(),
      preimage: payment_preimage
    }
  }

  async waitAnyInvoice(lastPayIndex?: number, reqId?: string): Promise<WaitAnyInvoiceResponse> {
    const response = await this.connection.commando({
      method: 'waitanyinvoice',
      params: { lastpay_index: lastPayIndex },
      rune: this.rune,
      reqId
    })

    return response as WaitAnyInvoiceResponse
  }

  async payInvoice(options: {
    /**Can be bolt11 or bolt12 */
    invoice: string
    type: 'bolt11' | 'bolt12'
    id: string
    amount_msat?: string
    description?: unknown
  }): Promise<Payment> {
    const { invoice, type, id, amount_msat: send_msat, description } = options

    const result = await this.connection.commando({
      method: 'pay',
      params: {
        label: id,
        bolt11: invoice,
        amount_msat: send_msat,
        description
      },
      rune: this.rune
    })

    const {
      payment_hash,
      payment_preimage,
      created_at,
      amount_msat,
      amount_sent_msat,
      status,
      destination
    } = result as PayResponse

    return {
      id,
      hash: payment_hash,
      preimage: payment_preimage,
      destination,
      type,
      direction: 'send',
      value: formatMsat(amount_msat),
      completedAt: new Date().toISOString(),
      expiresAt: null,
      startedAt: new Date(created_at * 1000).toISOString(),
      fee: Big(formatMsat(amount_sent_msat)).minus(formatMsat(amount_msat)).toString(),
      status,
      invoice: invoice
    }
  }

  /**Fetch an invoice for a BOLT12 Offer */
  async fetchInvoice(params: FetchInvoiceRequest['params']): Promise<FetchInvoiceResponse> {
    const result = await this.connection.commando({
      method: 'fetchinvoice',
      params,
      rune: this.rune
    })

    return result as FetchInvoiceResponse
  }

  /**Create an invoice for a BOLT12 Offer and send it to be paid */
  async sendInvoice(params: SendInvoiceRequest['params']): Promise<Payment> {
    const { offer, label, amount_msat, timeout, quantity } = params
    const createdAt = Date.now() / 1000

    const orderedParams = amount_msat
      ? [offer, label, amount_msat, timeout, quantity]
      : [offer, label, timeout, quantity]

    const result = await this.connection.commando({
      method: 'sendinvoice',
      params: orderedParams,
      rune: this.rune
    })

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
      completedAt: new Date(paid_at ? paid_at * 1000 : Date.now()).toISOString(),
      expiresAt: new Date(expires_at * 1000).toISOString(),
      startedAt: new Date(createdAt).toISOString(),
      fee: null,
      status: invoiceStatusToPaymentStatus(status as InvoiceStatus),
      invoice: bolt12,
      payIndex: pay_index
    }
  }

  async payKeysend(options: {
    destination: string
    id: string
    amount_msat: string
  }): Promise<Payment> {
    const { destination: send_destination, id, amount_msat: send_msat } = options

    const result = await this.connection.commando({
      method: 'keysend',
      params: {
        label: id,
        destination: send_destination,
        amount_msat: send_msat
      },
      rune: this.rune
    })

    const {
      payment_hash,
      payment_preimage,
      created_at,
      amount_msat,
      amount_sent_msat,
      status,
      destination
    } = result as KeysendResponse

    const amountMsat = formatMsat(amount_msat)

    return {
      id,
      hash: payment_hash,
      preimage: payment_preimage,
      destination,
      type: 'bolt11',
      direction: 'send',
      value: amountMsat,
      completedAt: new Date().toISOString(),
      expiresAt: null,
      startedAt: new Date(created_at * 1000).toISOString(),
      fee: Big(formatMsat(amount_sent_msat)).minus(amountMsat).toString(),
      status
    }
  }

  async getPayments(): Promise<Payment[]> {
    const { invoices } = await this.listInvoices()
    const { pays } = await this.listPays()
    const invoicePayments: Payment[] = await Promise.all(invoices.map(invoiceToPayment))
    const sentPayments: Payment[] = await Promise.all(pays.map(payToPayment))

    return sortPaymentsMostRecent(invoicePayments.concat(sentPayments))
  }

  async listInvoices(): Promise<ListinvoicesResponse> {
    const result = await this.connection.commando({ method: 'listinvoices', rune: this.rune })
    return result as ListinvoicesResponse
  }

  async listPays(): Promise<ListpaysResponse> {
    const result = await this.connection.commando({ method: 'listpays', rune: this.rune })
    return result as ListpaysResponse
  }

  async listFunds(): Promise<ListfundsResponse> {
    const result = await this.connection.commando({ method: 'listfunds', rune: this.rune })
    return result as ListfundsResponse
  }

  async signMessage(message: string): Promise<SignMessageResponse> {
    const result = await this.connection.commando({
      method: 'signmessage',
      rune: this.rune,
      params: { message }
    })

    return result as SignMessageResponse
  }

  async bkprListIncome(): Promise<IncomeEvent[]> {
    const result = (await this.connection.commando({
      method: 'bkpr-listincome',
      rune: this.rune
    })) as BkprListIncomeResponse

    const formatted = formatIncomeEvents(result.income_events)

    return formatted
  }

  async bkprChannelsAPY(): Promise<ChannelAPY[]> {
    const result = (await this.connection.commando({
      method: 'bkpr-channelsapy',
      rune: this.rune
    })) as BkprChannelsAPYResponse

    const formatted = formatChannelsAPY(result.channels_apy)

    return formatted
  }

  async listOffers(): Promise<ListOffersResponse['offers']> {
    const result = await this.connection.commando({
      method: 'listoffers',
      rune: this.rune
    })

    return (result as ListOffersResponse).offers
  }

  async listInvoiceRequests(): Promise<ListInvoiceRequestsResponse['invoicerequests']> {
    const result = await this.connection.commando({
      method: 'listinvoicerequests',
      rune: this.rune
    })

    return (result as ListInvoiceRequestsResponse).invoicerequests
  }

  async listNodes(id: string): Promise<ListNodesResponse> {
    const result = (await this.connection.commando({
      method: 'listnodes',
      rune: this.rune,
      params: { id }
    })) as ListNodesResponse

    return result
  }
}

export default CoreLn
