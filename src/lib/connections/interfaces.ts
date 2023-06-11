import type { Channel } from '$lib/@types/channels.js'
import type { SendTransactionOptions, Transaction } from '$lib/@types/transactions.js'
import type { Utxo } from '$lib/@types/utxos.js'
import type { BehaviorSubject, Subject } from 'rxjs'
import type { ConnectionInfoBase, ConnectionInfoType } from '$lib/@types/connections.js'
import type { Forward } from '$lib/@types/forwards.js'

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
  Invoice
} from '$lib/@types/invoices.js'

/** the live connection held in memory */
export type Connection = {
  id: ConnectionInfoBase['id']
  interface: ConnectionInterface
}

export interface ConnectionInterface {
  info: Info
  destroy$: Subject<void>
  updateToken?: (token: string) => void
  connect?: () => Promise<Info | null>
  disconnect?: () => void
  connectionStatus$?: BehaviorSubject<
    'connected' | 'connecting' | 'waiting_reconnect' | 'disconnected'
  >
  rpc?: RpcCall
  node?: NodeInterface
  offers?: OffersInterface
  invoices?: InvoicesInterface
  utxos?: UtxosInterface
  channels?: ChannelsInterface
  transactions?: TransactionsInterface
  forwards?: ForwardsInterface
  blocks?: BlocksInterface
}

export type Info = {
  id: string
  type: ConnectionInfoType
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
  /** Have the node sign a message, used for LNURL Auth */
  signMessage?(message: string): Promise<string>
}

export interface OffersInterface {
  connection: ConnectionInterface
  /** Get all offers and invoice requests */
  get(): Promise<Offer[]>
  /** Create a pay (offer) type offer */
  createPay?(options: CreatePayOfferOptions): Promise<Offer>
  /** Disable a pay (offer) type offer */
  disablePay?(offerId: string): Promise<void>
  /** Create a withdraw (invoice request) type offer */
  createWithdraw?(options: CreateWithdrawOfferOptions): Promise<Offer>
  /** Disable a withdraw (invoice request) type offer */
  disableWithdraw?(invoiceRequestId: string): Promise<void>
  /** Fetch an BOLT12 invoice for a BOLT12 Pay Offer */
  fetchInvoice?(options: FetchInvoiceOptions): Promise<string>
  /** Create an invoice for a BOLT12 Withdraw Offer and send it to be paid */
  sendInvoice?(options: SendInvoiceOptions): Promise<Invoice>
}

export interface InvoicesInterface {
  connection: ConnectionInterface
  /** Get all invoice receive and send invoices and format to a list of Payments */
  get(): Promise<Invoice[]>
  /** Create a BOLT 11 invoice to receive to */
  createInvoice?(options: CreateInvoiceOptions): Promise<Invoice>
  /** Pay a BOLT11 invoice */
  payInvoice?(options: PayInvoiceOptions): Promise<Invoice>
  /** Pay to a node public key via Keysend */
  payKeysend?(options: PayKeysendOptions): Promise<Invoice>
  /** listen for a specific invoice payment */
  listenForInvoicePayment?(payment: Invoice): Promise<Invoice>
  /** listen for any invoice payment after a particular pay index */
  listenForAnyInvoicePayment?(lastPayIndex?: number, reqId?: string): Promise<Invoice>
}

export interface UtxosInterface {
  connection: ConnectionInterface
  //** Get all utxos */
  get(): Promise<Utxo[]>
}

export interface ChannelsInterface {
  connection: ConnectionInterface
  /** get all channels for this node */
  get(): Promise<Channel[]>
}

export interface TransactionsInterface {
  connection: ConnectionInterface
  /** get all onchain transactions */
  get(): Promise<Transaction[]>
  /** derive a new bech32 receive address */
  receive?(): Promise<string>
  /** send to an onchain address */
  send?(options: SendTransactionOptions): Promise<Transaction>
  /** wait for an unconfirmed transaction to be included in a block */
  listenForTransactionConfirmation?(transaction: Transaction): Promise<Transaction>
}

export interface ForwardsInterface {
  connection: ConnectionInterface
  /** get all forwards for node */
  get(): Promise<Forward[]>
}

export interface BlocksInterface {
  connection: ConnectionInterface
  /** subscribe to increases in block height */
  blockHeight$: Subject<number>
}

export interface ConnectionError {
  /** the i18n key that maps to a generic message to display to the user */
  key: string
  detail: {
    /** unix timestamp in seconds */
    timestamp: number
    /** the message direct from the implementation that gives
     * specific details on what went wrong to help with debugging
     */
    message: string
    /** the context the error occured. ie what was the app trying to do
     * at the time of error?
     */
    context: string
  }
}
