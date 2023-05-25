import type { Channel } from '$lib/@types/channels.js'
import type { SendTransactionOptions, Transaction } from '$lib/@types/transactions.js'
import type { Utxo } from '$lib/@types/utxos.js'
import type { BehaviorSubject } from 'rxjs'

import type {
  CreatePayOfferOptions,
  CreateWithdrawOfferOptions,
  FetchInvoiceOptions,
  Offer,
  SendInvoiceOptions
} from '$lib/@types/offers.js'

import type {
  CreateInvoiceOptions,
  PayInvoiceOptions,
  PayKeysendOptions,
  Payment
} from '$lib/@types/payments.js'

export interface ConnectionInterface {
  info: Info
  updateToken?: (token: string) => void
  connect?: () => Promise<Info | null>
  disconnect?: () => void
  connectionStatus$?: BehaviorSubject<
    'connected' | 'connecting' | 'waiting_reconnect' | 'disconnected'
  >
  rpc: RpcCall
  node?: NodeInterface
  offers?: OffersInterface
  payments?: PaymentsInterface
  utxos?: UtxosInterface
  channels?: ChannelsInterface
  transactions?: TransactionsInterface
}

export type Info = {
  id: string
  connectionId: string
  alias?: string
  color?: string
  version?: string
}

export type RpcCall = (options: {
  method: string
  params?: unknown
  reqId?: string
}) => Promise<unknown>

export interface NodeInterface {
  connection: ConnectionInterface
  signMessage(message: string): Promise<string>
}

export interface OffersInterface {
  connection: ConnectionInterface
  get(): Promise<Offer[]>
  createPay(options: CreatePayOfferOptions): Promise<Offer>
  disablePay(offerId: string): Promise<void>
  createWithdraw(options: CreateWithdrawOfferOptions): Promise<Offer>
  disableWithdraw(invoiceRequestId: string): Promise<void>
  fetchInvoice(options: FetchInvoiceOptions): Promise<string>
  sendInvoice(options: SendInvoiceOptions): Promise<Payment>
}

export interface PaymentsInterface {
  connection: ConnectionInterface
  get(): Promise<Payment[]>
  createInvoice(options: CreateInvoiceOptions): Promise<Payment>
  payInvoice(options: PayInvoiceOptions): Promise<Payment>
  payKeysend(options: PayKeysendOptions): Promise<Payment>
  /** listen for a specific invoice payment */
  listenForInvoicePayment(payment: Payment): Promise<Payment>
  /** listen for any invoice payment after a particular pay index */
  listenForAnyInvoicePayment(lastPayIndex?: number, reqId?: string): Promise<Payment>
}

export interface UtxosInterface {
  connection: ConnectionInterface
  get(): Promise<Utxo[]>
}

export interface ChannelsInterface {
  connection: ConnectionInterface
  get(): Promise<Channel[]>
}

export interface TransactionsInterface {
  connection: ConnectionInterface
  get(): Promise<Transaction[]>
  /** derive a new bech32 receive address */
  receive(): Promise<string>
  send(options: SendTransactionOptions): Promise<Transaction>
}
