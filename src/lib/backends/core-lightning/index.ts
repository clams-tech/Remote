import LnMessage from 'lnmessage'
import Big from 'big.js'
import type { Auth, Payment } from '$lib/types'
import { formatMsat, parseNodeAddress, sortPaymentsMostRecent } from '$lib/utils'
import { formatChannelsAPY, formatIncomeEvents, invoiceToPayment, payToPayment } from './utils'
import type { Logger } from 'lnmessage/dist/types'
import { settings$ } from '$lib/streams'

import type {
  BkprChannelsAPYResponse,
  BkprListIncomeResponse,
  ChannelAPY,
  GetinfoResponse,
  IncomeEvent,
  InvoiceRequest,
  InvoiceResponse,
  KeysendResponse,
  ListfundsResponse,
  ListinvoicesResponse,
  ListpaysResponse,
  PayResponse,
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
      bolt11,
      description,
      hash: payment_hash,
      preimage: payment_secret
    }

    return payment
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
    bolt11: string
    id: string
    amount_msat?: string
    description?: unknown
  }): Promise<Payment> {
    const { bolt11, id, amount_msat: send_msat, description } = options

    const result = await this.connection.commando({
      method: 'pay',
      params: {
        label: id,
        bolt11,
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
      type: 'bolt11',
      direction: 'send',
      value: formatMsat(amount_msat),
      completedAt: new Date().toISOString(),
      expiresAt: null,
      startedAt: new Date(created_at * 1000).toISOString(),
      fee: Big(formatMsat(amount_sent_msat)).minus(formatMsat(amount_msat)).toString(),
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
}

export default CoreLn
