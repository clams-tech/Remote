import type { SendTransactionOptions, Transaction } from '$lib/@types/transactions.js'
import type { Utxo } from '$lib/@types/utxos.js'
import type { BehaviorSubject, Observable, Subject } from 'rxjs'
import type { Wallet } from '$lib/@types/wallets.js'
import type { Forward } from '$lib/@types/forwards.js'
import type { AppError } from '$lib/@types/errors.js'

import type {
  Channel,
  ConnectPeerOptions,
  OpenChannelOptions,
  OpenChannelResult,
  UpdateChannelOptions
} from '$lib/@types/channels.js'

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
import type { Trade } from '$lib/@types/trades.js'
import type { Withdrawal } from '$lib/@types/withdrawals.js'
import type { Deposit } from '$lib/@types/deposits.js'

export type ConnectionStatus = 'connected' | 'connecting' | 'waiting_reconnect' | 'disconnected'

export interface Connection {
  walletId: Wallet['id']
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
  balance?: BalanceInterface
  offers?: OffersInterface
  invoices?: InvoicesInterface
  utxos?: UtxosInterface
  channels?: ChannelsInterface
  transactions?: TransactionsInterface
  forwards?: ForwardsInterface
  blocks?: BlocksInterface
  trades?: TradesInterface
  withdrawals?: WithdrawalsInterface
  deposits?: DepositsInterface
}

export type Info = {
  id: string
  alias?: string
  color?: string
  version?: string
  host?: string
  port?: number
}

export type RpcCall = (options: {
  method: string
  params?: unknown
  reqId?: string
}) => Promise<unknown>

export interface NodeInterface {
  connection: Connection
  /** Have the node sign a message, used for LNURL Auth */
  signMessage?(message: string): Promise<string>
}

export interface OffersInterface {
  connection: Connection
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
  connection: Connection
  /** Get all invoice receive and send invoices and format to a list of Payments */
  get(): Promise<Invoice[]>
  /** Create a BOLT 11 invoice to receive to */
  create?(options: CreateInvoiceOptions): Promise<Invoice>
  /** Pay a BOLT11 invoice */
  pay?(options: PayInvoiceOptions): Promise<Invoice>
  /** Pay to a node public key via Keysend */
  keysend?(options: PayKeysendOptions): Promise<Invoice>
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
  connection: Connection
  //** Get all utxos */
  get(): Promise<Utxo[]>
}

export interface ChannelsInterface {
  connection: Connection
  /** get all channels for this node */
  get(channel?: { id: string; peerId: string }): Promise<Channel[]>
  /** update a channel fees and htlc settings */
  update?(options: UpdateChannelOptions): Promise<void>
  /** open a new channel */
  open?(options: OpenChannelOptions): Promise<OpenChannelResult>
  /** connect to a peer node */
  connect?(options: ConnectPeerOptions): Promise<void>
}

export interface TransactionsInterface {
  connection: Connection
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
  connection: Connection
  /** get all forwards for node */
  get(): Promise<Forward[]>
}

export interface BlocksInterface {
  connection: Connection
  subscribeToBlockHeight(): Promise<Observable<number>>
  getCurrentBlockHeight(): Promise<number>
}

export interface TradesInterface {
  get(): Promise<Trade[]>
}

export interface WithdrawalsInterface {
  get(): Promise<Withdrawal[]>
}

export interface DepositsInterface {
  get(): Promise<Deposit[]>
}

export interface BalanceInterface {
  get(): Promise<number>
}
