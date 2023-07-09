import type {
  Channel,
  ConnectPeerOptions,
  OpenChannelOptions,
  OpenChannelResult,
  UpdateChannelOptions
} from '$lib/@types/channels.js'
import type { SendTransactionOptions, Transaction } from '$lib/@types/transactions.js'
import type { Utxo } from '$lib/@types/utxos.js'
import type { BehaviorSubject, Subject } from 'rxjs'
import type { ConnectionDetails } from '$lib/@types/connections.js'
import type { Forward } from '$lib/@types/forwards.js'
import type { AppError } from '$lib/@types/errors.js'

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
  id: ConnectionDetails['id']
  interface: ConnectionInterface
}

export type ConnectionStatus = 'connected' | 'connecting' | 'waiting_reconnect' | 'disconnected'

export interface ConnectionInterface {
  /** basic info about the connection including the connection id for looking configuration */
  info: Info
  /** observable used to clean up all internal subscribers, will fire when connection is destroyed */
  destroy$: Subject<void>
  /** observable of errors that have occured during this connection */
  errors$: Subject<AppError>
  /** the current connection status */
  connectionStatus$: BehaviorSubject<ConnectionStatus>
  updateToken?: (token: string) => void
  connect?: () => Promise<Info | null>
  disconnect?: () => void
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
  /** the connection details this connection is associated with */
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
  /** listen for a specific invoice payment
   * must handle disconnection and reconnection logic
   */
  listenForInvoicePayment?(invoice: Invoice): Promise<Invoice>
  /** listen for any invoice payment after a particular pay index
   * must handle disconnection and reconnection logic
   */
  listenForAnyInvoicePayment?(
    onPayment: (invoice: Invoice) => Promise<void>,
    payIndex?: Invoice['payIndex']
  ): Promise<void>
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
  /** update a channel fees and htlc settings */
  update?(options: UpdateChannelOptions): Promise<void>
  /** open a new channel */
  open?(options: OpenChannelOptions): Promise<OpenChannelResult>
  /** connect to a peer node */
  connect?(options: ConnectPeerOptions): Promise<void>
}

export interface TransactionsInterface {
  connection: ConnectionInterface
  /** get all onchain transactions */
  get(): Promise<Transaction[]>
  /** derive a new bech32 receive address */
  receive?(): Promise<string>
  /** send to an onchain address */
  send?(options: SendTransactionOptions): Promise<Transaction>
  /** wait for an unconfirmed transaction to be included in a block
   * must handle disconnection and reconnection logic
   */
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
