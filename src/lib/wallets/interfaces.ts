import type { SendTransactionOptions } from '$lib/@types/transactions.js'
import type { Utxo } from '$lib/@types/utxos.js'
import type { BehaviorSubject, Observable, Subject } from 'rxjs'
import type { Wallet } from '$lib/@types/wallets.js'
import type { Forward } from '$lib/@types/forwards.js'
import type { AppError } from '$lib/@types/errors.js'
import type { Trade } from '$lib/@types/trades.js'
import type { Withdrawal } from '$lib/@types/withdrawals.js'
import type { Deposit } from '$lib/@types/deposits.js'
import type { InvoicePayment, Network, TransactionPayment } from '$lib/@types/payments.js'
import type { Node } from '$lib/@types/nodes.js'

import type {
  Channel,
  CloseChannelOptions,
  CloseChannelResult,
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
  PayKeysendOptions
} from '$lib/@types/invoices.js'
import type {
  Plugin,
  ClbossStatus,
  PrismType,
  PrismMember,
  PrismMemberPayouts,
  DeletedPrism,
  PrismBinding
} from '$lib/@types/plugins'

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
  signatures?: SignaturesInterface
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
  network?: NetworkInterface
  plugins?: PluginsInterface
  clboss?: ClbossInterface
  prism?: PrismInterface
}

export type Info = {
  id: string
  network: Network
  alias?: string
  color?: string
  version?: string
  host?: string
  port?: number
  bitcoindSynced?: boolean
  lightningdSynced?: boolean
}

export type RpcCall = (options: {
  method: string
  params?: unknown
  reqId?: string
}) => Promise<unknown>

export interface SignaturesInterface {
  connection: Connection
  /** Sign a message, used for LNURL Auth */
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
  sendInvoice?(options: SendInvoiceOptions): Promise<InvoicePayment>
  payInvoice?(bolt12: string): Promise<InvoicePayment>
}

export interface InvoicesInterface {
  connection: Connection
  /** Get all invoice receive and send invoices and format to a list of Payments */
  get(): Promise<InvoicePayment[]>
  /** Create a BOLT 11 invoice to receive to */
  create?(options: CreateInvoiceOptions): Promise<InvoicePayment>
  /** Pay a BOLT11 invoice */
  pay?(options: PayInvoiceOptions): Promise<InvoicePayment>
  /** Pay to a node public key via Keysend */
  keysend?(options: PayKeysendOptions): Promise<InvoicePayment>
  /** listen for a specific invoice payment
   * must handle disconnection and reconnection logic
   */
  listenForInvoicePayment?(invoice: InvoicePayment): Promise<InvoicePayment>
  /** listen for any invoice payment after a particular pay index
   * must handle disconnection and reconnection logic
   */
  listenForAnyInvoicePayment?(
    onPayment: (invoice: InvoicePayment) => Promise<void>,
    payIndex?: InvoicePayment['data']['payIndex']
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
  /** close a channel */
  close?(options: CloseChannelOptions): Promise<CloseChannelResult>
  /** open a new channel */
  open?(options: OpenChannelOptions): Promise<OpenChannelResult>
  /** connect to a peer node */
  connect?(options: ConnectPeerOptions): Promise<void>
}

export interface TransactionsInterface {
  connection: Connection
  /** get all onchain transactions */
  get(): Promise<TransactionPayment[]>
  /** derive a new bech32 receive address */
  receive?(): Promise<string>
  /** send to an onchain address */
  send?(options: SendTransactionOptions): Promise<TransactionPayment>
  /** wait for an unconfirmed transaction to be included in a block
   * must handle disconnection and reconnection logic
   */
  listenForTransactionConfirmation?(transaction: TransactionPayment): Promise<TransactionPayment>
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

export interface NetworkInterface {
  /** get node details */
  getNode(id: string): Promise<Node | null>
}

export interface PluginsInterface {
  connection: Connection
  list(): Promise<Plugin[]>
  start(plugin: string): Promise<Plugin[]>
  stop(plugin: string): Promise<string>
}

export interface ClbossInterface {
  connection: Connection
  getStatus(): Promise<ClbossStatus>
  ignoreOnchain(hours: number): Promise<object>
  noticeOnchain(): Promise<object>
  unmanage(nodeId: string, tags: string): Promise<object>
}

export interface PrismInterface {
  connection: Connection
  listPrisms(): Promise<PrismType[]>
  createPrism(
    description: string,
    members: PrismMember[],
    outlay_factor: number
  ): Promise<PrismType>
  payPrism(prism_id: string, amount_msat: number): Promise<PrismMemberPayouts>
  deletePrism(prism_id: string): Promise<DeletedPrism>
  listBindings(offer_id?: string): Promise<PrismBinding[]>
  createBinding(prism_id: string, offer_id: string): Promise<unknown>
  updateBindingOutlay(
    offer_id: string,
    member_id: string,
    new_outlay_msat: number
  ): Promise<PrismBinding[]>
  deleteBinding(offer_id: string): Promise<unknown>
}
