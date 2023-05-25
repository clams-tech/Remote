import Big from 'big.js'
import { formatMsat, isBolt12Invoice, nowSeconds } from '$lib/utils.js'
import { invoiceToPayment, payToPayment } from './utils.js'
import type { ConnectionInterface, PaymentsInterface } from '../interfaces.js'

import type {
  CreateInvoiceOptions,
  PayInvoiceOptions,
  PayKeysendOptions,
  Payment
} from '$lib/@types/payments.js'

import type {
  InvoiceResponse,
  KeysendResponse,
  ListinvoicesResponse,
  ListpaysResponse,
  PayResponse,
  WaitAnyInvoiceResponse,
  WaitInvoiceResponse
} from './types.js'

class Payments implements PaymentsInterface {
  connection: ConnectionInterface

  constructor(connection: ConnectionInterface) {
    this.connection = connection
  }

  async get(): Promise<Payment[]> {
    const { invoices } = (await this.connection.rpc({
      method: 'listinvoices'
    })) as ListinvoicesResponse
    const { pays } = (await await this.connection.rpc({ method: 'listpays' })) as ListpaysResponse
    const invoicePayments: Payment[] = await Promise.all(
      invoices.map((invoice) => invoiceToPayment(invoice, this.connection.info.id))
    )
    const sentPayments: Payment[] = await Promise.all(
      pays.map((pay) => payToPayment(pay, this.connection.info.id))
    )

    return invoicePayments.concat(sentPayments)
  }

  async createInvoice(options: CreateInvoiceOptions): Promise<Payment> {
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
  }

  async payInvoice(options: PayInvoiceOptions): Promise<Payment> {
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
  }

  async payKeysend(options: PayKeysendOptions): Promise<Payment> {
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
  }

  async listenForInvoicePayment(payment: Payment): Promise<Payment> {
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
  }

  async listenForAnyInvoicePayment(
    lastPayIndex?: number | undefined,
    reqId?: string
  ): Promise<Payment> {
    const response = await this.connection.rpc({
      method: 'waitanyinvoice',
      params: { lastpay_index: lastPayIndex },
      reqId
    })

    return invoiceToPayment(response as WaitAnyInvoiceResponse, this.connection.info.id)
  }
}

export default Payments
