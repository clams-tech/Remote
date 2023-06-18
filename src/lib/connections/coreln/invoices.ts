import Big from 'big.js'
import { formatMsat, isBolt12Invoice, nowSeconds } from '$lib/utils.js'
import { invoiceToPayment, payToPayment } from './utils.js'
import type { InvoicesInterface } from '../interfaces.js'
import handleError from './error.js'

import type {
  CreateInvoiceOptions,
  PayInvoiceOptions,
  PayKeysendOptions,
  Invoice
} from '$lib/@types/invoices.js'

import type {
  CorelnConnectionInterface,
  CoreLnError,
  InvoiceResponse,
  KeysendResponse,
  ListinvoicesResponse,
  ListpaysResponse,
  PayResponse,
  WaitAnyInvoiceResponse,
  WaitInvoiceResponse
} from './types.js'

class Invoices implements InvoicesInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  async get(): Promise<Invoice[]> {
    try {
      const [invoicesResponse, paysResponse] = await Promise.all([
        this.connection.rpc({ method: 'listinvoices' }),
        this.connection.rpc({ method: 'listpays' })
      ])

      const { invoices } = invoicesResponse as ListinvoicesResponse
      const { pays } = paysResponse as ListpaysResponse

      const invoicePayments: Invoice[] = await Promise.all(
        invoices.map((invoice) => invoiceToPayment(invoice, this.connection.info.connectionId))
      )

      const sentPayments: Invoice[] = await Promise.all(
        pays.map((pay) => payToPayment(pay, this.connection.info.connectionId))
      )

      return invoicePayments.concat(sentPayments)
    } catch (error) {
      const context = 'get (payments)'
      const connectionError = handleError(error as CoreLnError, context)
      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }

  async createInvoice(options: CreateInvoiceOptions): Promise<Invoice> {
    try {
      const { id, amount, description, expiry } = options
      const startedAt = nowSeconds()

      const result = await this.connection.rpc({
        method: 'invoice',
        params: {
          label: id,
          amount_msat: amount,
          description,
          expiry
        }
      })

      const { bolt11, expires_at, payment_hash, payment_secret } = result as InvoiceResponse

      const payment: Invoice = {
        id,
        status: 'pending',
        direction: 'receive',
        value: amount,
        fee: null,
        type: 'bolt11',
        startedAt,
        completedAt: null,
        expiresAt: expires_at,
        request: bolt11,
        description,
        hash: payment_hash,
        preimage: payment_secret,
        connectionId: this.connection.info.connectionId
      }

      return payment
    } catch (error) {
      const context = 'createInvoice (payments)'
      const connectionError = handleError(error as CoreLnError, context)
      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }

  async payInvoice(options: PayInvoiceOptions): Promise<Invoice> {
    try {
      const { request, id, amount, description } = options

      const result = await this.connection.rpc({
        method: 'pay',
        params: {
          label: id,
          bolt11: request,
          amount_msat: amount,
          description
        }
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
        type: isBolt12Invoice(request) ? 'bolt12' : 'bolt11',
        direction: 'send',
        value: formatMsat(amount_msat),
        completedAt: nowSeconds(),
        expiresAt: null,
        startedAt: created_at,
        fee: Big(formatMsat(amount_sent_msat)).minus(formatMsat(amount_msat)).toString(),
        status,
        request,
        connectionId: this.connection.info.connectionId
      }
    } catch (error) {
      const context = 'payInvoice (payments)'
      const connectionError = handleError(error as CoreLnError, context)
      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }

  async payKeysend(options: PayKeysendOptions): Promise<Invoice> {
    try {
      const { destination, id, amount } = options

      const result = await this.connection.rpc({
        method: 'keysend',
        params: {
          label: id,
          destination,
          amount_msat: amount
        }
      })

      const { payment_hash, payment_preimage, created_at, amount_msat, amount_sent_msat, status } =
        result as KeysendResponse

      const amountMsat = formatMsat(amount_msat)

      // get the invoice by payment_hash for request parameter of Invoice type
      const listInvoiceResult = await this.connection.rpc({
        method: 'listinvoice',
        params: { payment_hash }
      })

      const {
        invoices: [{ bolt11 }]
      } = listInvoiceResult as ListinvoicesResponse

      return {
        id,
        hash: payment_hash,
        preimage: payment_preimage,
        destination,
        type: 'bolt11',
        direction: 'send',
        value: amountMsat,
        completedAt: nowSeconds(),
        expiresAt: null,
        startedAt: created_at,
        fee: Big(formatMsat(amount_sent_msat)).minus(amountMsat).toString(),
        status,
        connectionId: this.connection.info.connectionId,
        request: bolt11 as string
      }
    } catch (error) {
      const context = 'payKeysend (payments)'
      const connectionError = handleError(error as CoreLnError, context)
      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }

  async listenForInvoicePayment(payment: Invoice): Promise<Invoice> {
    try {
      const { id } = payment

      const result = await this.connection.rpc({
        method: 'waitinvoice',
        params: {
          label: id
        }
      })

      const { status, amount_received_msat, paid_at, payment_preimage } =
        result as WaitInvoiceResponse

      return {
        ...payment,
        status: status === 'paid' ? 'complete' : 'expired',
        value: formatMsat(amount_received_msat || payment.value),
        completedAt: paid_at as number,
        preimage: payment_preimage
      }
    } catch (error) {
      const context = 'listenForInvoicePayment (payments)'
      const connectionError = handleError(error as CoreLnError, context)
      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }

  async listenForAnyInvoicePayment(
    lastPayIndex?: number | undefined,
    reqId?: string
  ): Promise<Invoice> {
    try {
      // @TODO - add logs here and test what happens when connection drops
      const response = await this.connection.rpc({
        method: 'waitanyinvoice',
        params: { lastpay_index: lastPayIndex },
        reqId
      })

      return invoiceToPayment(response as WaitAnyInvoiceResponse, this.connection.info.connectionId)
    } catch (error) {
      const context = 'listenForAnyInvoicePayment (payments)'
      const connectionError = handleError(error as CoreLnError, context)
      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }
}

export default Invoices
