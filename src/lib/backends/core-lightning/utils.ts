import Big from 'big.js'
import { decode } from 'light-bolt11-decoder'
import { lnsocketProxy } from '$lib/constants'
import { credentials$ } from '$lib/streams'
import type { Payment } from '$lib/types'
import { formatDecodedInvoice } from '$lib/utils'
import { connect } from './commando'

import type { LNRequest, LNResponse, InvoiceStatus, ConnectOptions, Invoice, Pay } from './types'

export function connectionToConnectOptions(connection: string): ConnectOptions {
  const [publicKey, host] = connection.split('@')
  const wsUrl = `${lnsocketProxy}/${host}`

  return { publicKey, wsUrl }
}

export async function rpcRequest(request: LNRequest): Promise<LNResponse | null> {
  const credentials = credentials$.getValue()

  if (!credentials.rune) {
    throw new Error('Credentials must be set before making rpc requests')
  }

  const { connection, rune } = credentials
  const connectOptions = connectionToConnectOptions(connection)
  const commando = connect(connectOptions)

  commando.call({ ...request, rune })

  return null
}

export function invoiceStatusToPaymentStatus(status: InvoiceStatus): Payment['status'] {
  switch (status) {
    case 'paid':
      return 'complete'
    case 'unpaid':
      return 'pending'
    default:
      return 'expired'
  }
}

export function invoiceToPayment(invoice: Invoice): Payment {
  const {
    label,
    bolt11,
    payment_hash,
    amount_received_msat,
    amount_msat,
    status,
    paid_at,
    payment_preimage,
    description,
    expires_at,
    pay_index
  } = invoice

  const decodedInvoice = decode(bolt11)
  const { timestamp } = formatDecodedInvoice(decodedInvoice)

  return {
    id: label || payment_hash,
    bolt11: bolt11 || null,
    hash: payment_hash,
    direction: 'receive',
    type: 'payment_request',
    preimage: payment_preimage,
    value: (amount_received_msat || amount_msat || 'any') as string,
    status: invoiceStatusToPaymentStatus(status),
    completedAt: paid_at ? new Date(paid_at * 1000).toISOString() : null,
    expiresAt: new Date(expires_at * 1000).toISOString(),
    description,
    destination: undefined,
    fee: null,
    startedAt: new Date(timestamp * 1000).toISOString(),
    payIndex: pay_index
  }
}

export function payToPayment(pay: Pay): Payment {
  const {
    bolt11,
    destination,
    payment_hash,
    status,
    created_at,
    label,
    preimage,
    amount_msat,
    amount_sent_msat
  } = pay

  const timestamp = new Date(created_at * 1000).toISOString()
  const decodedInvoice = bolt11 && decode(bolt11)

  const { description } = decodedInvoice
    ? formatDecodedInvoice(decodedInvoice)
    : { description: undefined }

  return {
    id: label || payment_hash,
    destination,
    bolt11: bolt11 || null,
    status,
    startedAt: timestamp,
    hash: payment_hash,
    preimage,
    value: amount_msat,
    fee: Big(amount_sent_msat).minus(amount_msat).toString(),
    direction: 'send',
    type: bolt11 ? 'payment_request' : 'node_public_key',
    expiresAt: null,
    completedAt: timestamp,
    description
  }
}
