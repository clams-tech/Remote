import Big from 'big.js'
import type { Payment } from '$lib/types'
import { sortPaymentsMostRecent } from '$lib/utils'
import { invoiceToPayment, payToPayment } from './utils'

import type {
  GetinfoResponse,
  InvoiceRequest,
  InvoiceResponse,
  KeysendResponse,
  ListfundsResponse,
  ListinvoicesResponse,
  ListpaysResponse,
  PayResponse,
  RpcRequest,
  WaitAnyInvoiceResponse,
  WaitInvoiceResponse
} from './types'

class CoreLn {
  public initialised: boolean
  public request: RpcRequest
  public rune: string

  constructor() {
    this.initialised = false
    this.request = () => {
      throw new Error('Must initialise before calling rpc methods')
    }
  }

  init(options: { request: RpcRequest; rune: string }) {
    const { request, rune } = options

    this.request = request
    this.rune = rune
    this.initialised = true
  }

  async getInfo(): Promise<GetinfoResponse> {
    const result = await this.request({ method: 'getinfo', rune: this.rune })
    return result as GetinfoResponse
  }

  async createInvoice(params: InvoiceRequest['params']): Promise<Payment> {
    const { label, amount_msat, description } = params
    const startedAt = new Date().toISOString()

    const result = await this.request({
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
      type: 'payment_request',
      startedAt,
      completedAt: null,
      expiresAt: new Date(expires_at * 1000).toISOString(),
      bolt11,
      description,
      hash: payment_hash,
      preimage: payment_secret
    }

    return payment
  }

  async waitForInvoicePayment(payment: Payment): Promise<Payment> {
    const { id } = payment

    const result = await this.request({
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
      value: amount_received_msat || payment.value,
      completedAt: new Date((paid_at as number) * 1000).toISOString(),
      preimage: payment_preimage
    }
  }

  async waitAnyInvoice(lastPayIndex: number): Promise<WaitAnyInvoiceResponse> {
    const response = await this.request({
      method: 'waitanyinvoice',
      params: { lastpay_index: lastPayIndex },
      rune: this.rune
    })

    return response as WaitAnyInvoiceResponse
  }

  async payInvoice(options: {
    bolt11: string
    id: string
    amount_msat?: string
  }): Promise<Payment> {
    const { bolt11, id, amount_msat: send_msat } = options

    const result = await this.request({
      method: 'pay',
      params: {
        label: id,
        bolt11,
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
    } = result as PayResponse

    return {
      id,
      hash: payment_hash,
      preimage: payment_preimage,
      destination,
      type: 'payment_request',
      direction: 'send',
      value: amount_msat,
      completedAt: new Date().toISOString(),
      expiresAt: null,
      startedAt: new Date(created_at * 1000).toISOString(),
      fee: Big(amount_sent_msat).minus(amount_msat).toString(),
      status,
      bolt11
    }
  }

  async payKeysend(options: {
    destination: string
    id: string
    amount_msat: string
  }): Promise<Payment> {
    const { destination: send_destination, id, amount_msat: send_msat } = options

    const result = await this.request({
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

    return {
      id,
      hash: payment_hash,
      preimage: payment_preimage,
      destination,
      type: 'payment_request',
      direction: 'send',
      value: amount_msat,
      completedAt: new Date().toISOString(),
      expiresAt: null,
      startedAt: new Date(created_at * 1000).toISOString(),
      fee: Big(amount_sent_msat).minus(amount_msat).toString(),
      status,
      bolt11: null
    }
  }

  async getPayments(): Promise<Payment[]> {
    const { invoices } = await this.listInvoices()
    const { pays } = await this.listPays()
    const invoicePayments: Payment[] = invoices.map(invoiceToPayment)
    const sentPayments: Payment[] = pays.map(payToPayment)

    return sortPaymentsMostRecent(invoicePayments.concat(sentPayments))
  }

  async listInvoices(): Promise<ListinvoicesResponse> {
    const result = await this.request({ method: 'listinvoices', rune: this.rune })
    return result as ListinvoicesResponse
  }

  async listPays(): Promise<ListpaysResponse> {
    const result = await this.request({ method: 'listpays', rune: this.rune })
    return result as ListpaysResponse
  }

  async listFunds(): Promise<ListfundsResponse> {
    const result = await this.request({ method: 'listfunds', rune: this.rune })
    return result as ListfundsResponse
  }
}

const coreLn = new CoreLn()

export default coreLn
