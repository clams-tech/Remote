import Big from 'big.js'
import type { Payment } from '$lib/@types/payments.js'
import { formatMsat, nowSeconds } from '$lib/utils.js'
import { invoiceToPayment, payToPayment } from './utils.js'
import type { Node } from '$lib/@types/nodes.js'

import type {
  InvoiceRequest,
  InvoiceResponse,
  KeysendResponse,
  ListinvoicesResponse,
  ListpaysResponse,
  PayResponse,
  RpcCall,
  WaitAnyInvoiceResponse,
  WaitInvoiceResponse
} from './types.js'

const payments = (rpc: RpcCall, node: Node) => {
  /** Get all payments (pays, invoices) */
  const get = async (): Promise<Payment[]> => {
    const { invoices } = (await rpc({ method: 'listinvoices' })) as ListinvoicesResponse
    const { pays } = (await await rpc({ method: 'listpays' })) as ListpaysResponse
    const invoicePayments: Payment[] = await Promise.all(invoices.map(invoiceToPayment))
    const sentPayments: Payment[] = await Promise.all(pays.map(payToPayment))

    return invoicePayments.concat(sentPayments)
  }

  /** Create a BOLT11 invoice */
  const createInvoice = async (params: InvoiceRequest['params']): Promise<Payment> => {
    const { label, amount_msat, description } = params
    const startedAt = nowSeconds()

    const result = await rpc({
      method: 'invoice',
      params
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
      expiresAt: expires_at,
      invoice: bolt11,
      description,
      hash: payment_hash,
      preimage: payment_secret,
      nodeId: node.id
    }

    return payment
  }

  /** Pay a BOLT11 invoice */
  const payInvoice = async (options: {
    /**Can be bolt11 or bolt12 */
    invoice: string
    type: 'bolt11' | 'bolt12'
    id: string
    amount_msat?: string
    description?: unknown
  }): Promise<Payment> => {
    const { invoice, type, id, amount_msat: send_msat, description } = options

    const result = await rpc({
      method: 'pay',
      params: {
        label: id,
        bolt11: invoice,
        amount_msat: send_msat,
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
      type,
      direction: 'send',
      value: formatMsat(amount_msat),
      completedAt: nowSeconds(),
      expiresAt: null,
      startedAt: created_at,
      fee: Big(formatMsat(amount_sent_msat)).minus(formatMsat(amount_msat)).toString(),
      status,
      invoice: invoice,
      nodeId: node.id
    }
  }

  /** Wait for a specific BOLT11 payment */
  const waitForInvoicePayment = async (payment: Payment): Promise<Payment> => {
    const { id } = payment

    const result = await rpc({
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

  /** Listen for any invoice payments after a pay index */
  const waitAnyInvoice = async (
    lastPayIndex?: number,
    reqId?: string
  ): Promise<WaitAnyInvoiceResponse> => {
    const response = await rpc({
      method: 'waitanyinvoice',
      params: { lastpay_index: lastPayIndex },
      reqId
    })

    return response as WaitAnyInvoiceResponse
  }

  /** Keysend payment to a destination node public key */
  const payKeysend = async (options: {
    destination: string
    id: string
    amount_msat: string
  }): Promise<Payment> => {
    const { destination: send_destination, id, amount_msat: send_msat } = options

    const result = await rpc({
      method: 'keysend',
      params: {
        label: id,
        destination: send_destination,
        amount_msat: send_msat
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
      completedAt: nowSeconds(),
      expiresAt: null,
      startedAt: created_at,
      fee: Big(formatMsat(amount_sent_msat)).minus(amountMsat).toString(),
      status,
      nodeId: node.id
    }
  }

  return {
    get,
    createInvoice,
    payInvoice,
    waitForInvoicePayment,
    waitAnyInvoice,
    payKeysend
  }
}

export default payments
