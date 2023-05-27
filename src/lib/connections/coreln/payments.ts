import Big from 'big.js'
import { formatMsat, isBolt12Invoice, nowSeconds } from '$lib/utils.js'
import { invoiceToPayment, payToPayment } from './utils.js'
import type { PaymentsInterface } from '../interfaces.js'

import type {
  CreateInvoiceOptions,
  PayInvoiceOptions,
  PayKeysendOptions,
  Payment
} from '$lib/@types/payments.js'

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
import handleError from './error.js'

class Payments implements PaymentsInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  async get(): Promise<Payment[]> {
    try {
      const [invoicesResponse, paysResponse] = await Promise.all([
        this.connection.rpc({ method: 'listinvoices' }),
        this.connection.rpc({ method: 'listpays' })
      ])

      const { invoices } = invoicesResponse as ListinvoicesResponse
      const { pays } = paysResponse as ListpaysResponse

      const invoicePayments: Payment[] = await Promise.all(
        invoices.map((invoice) => invoiceToPayment(invoice, this.connection.info.id))
      )

      const sentPayments: Payment[] = await Promise.all(
        pays.map((pay) => payToPayment(pay, this.connection.info.id))
      )

      return invoicePayments.concat(sentPayments)
    } catch (error) {
      const context = 'get (payments)'
      throw handleError(error as CoreLnError, context)
    }
  }

  async createInvoice(options: CreateInvoiceOptions): Promise<Payment> {
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

      const payment: Payment = {
        id,
        status: 'pending',
        direction: 'receive',
        value: amount,
        fee: null,
        type: 'bolt11',
        startedAt,
        completedAt: null,
        expiresAt: expires_at,
        invoice: bolt11,
        description,
        hash: payment_hash,
        preimage: payment_secret,
        nodeId: this.connection.info.id
      }

      return payment
    } catch (error) {
      const context = 'createInvoice (payments)'
      throw handleError(error as CoreLnError, context)
    }
  }

  async payInvoice(options: PayInvoiceOptions): Promise<Payment> {
    try {
      const { invoice, id, amount, description } = options

      const result = await this.connection.rpc({
        method: 'pay',
        params: {
          label: id,
          bolt11: invoice,
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
        type: isBolt12Invoice(invoice) ? 'bolt12' : 'bolt11',
        direction: 'send',
        value: formatMsat(amount_msat),
        completedAt: nowSeconds(),
        expiresAt: null,
        startedAt: created_at,
        fee: Big(formatMsat(amount_sent_msat)).minus(formatMsat(amount_msat)).toString(),
        status,
        invoice,
        nodeId: this.connection.info.id
      }
    } catch (error) {
      const context = 'payInvoice (payments)'
      throw handleError(error as CoreLnError, context)
    }
  }

  async payKeysend(options: PayKeysendOptions): Promise<Payment> {
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
        nodeId: this.connection.info.id
      }
    } catch (error) {
      const context = 'payKeysend (payments)'
      throw handleError(error as CoreLnError, context)
    }
  }

  async listenForInvoicePayment(payment: Payment): Promise<Payment> {
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
      throw handleError(error as CoreLnError, context)
    }
  }

  async listenForAnyInvoicePayment(
    lastPayIndex?: number | undefined,
    reqId?: string
  ): Promise<Payment> {
    try {
      const response = await this.connection.rpc({
        method: 'waitanyinvoice',
        params: { lastpay_index: lastPayIndex },
        reqId
      })

      return invoiceToPayment(response as WaitAnyInvoiceResponse, this.connection.info.id)
    } catch (error) {
      const context = 'listenForAnyInvoicePayment (payments)'
      throw handleError(error as CoreLnError, context)
    }
  }
}

export default Payments
