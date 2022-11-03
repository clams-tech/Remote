import type { JsonRpcRequest } from 'lnmessage/dist/types'

// ==== REQUESTS ==== //

export type GetinfoRequest = {
  method: 'getinfo'
}

export type ListinvoicesRequest = {
  method: 'listinvoices'
  params?: {
    label?: string
    invstring?: string
    payment_hash?: string
    offer_id?: string
  }
}

export type ListpaysRequest = {
  method: 'listpays'
}

export type InvoiceRequest = {
  method: 'invoice'
  params: {
    amount_msat: string | 'any'
    label: string
    description: string
    expiry?: number
    cltv?: number | string
  }
}

export type PayRequest = {
  method: 'pay'
  params: {
    bolt11: string
    amount_msat?: string
    label?: string
    riskfactor?: string
    maxfeepercent?: string
    retry_for?: number
    maxdelay?: string
    exemptfee?: string
    exclude?: string
  }
}

export type WaitInvoiceRequest = {
  method: 'waitinvoice'
  params: {
    label: string
  }
}

export type WaitAnyInvoiceRequest = {
  method: 'waitanyinvoice'
  params: {
    lastpay_index: number
  }
}

export interface KeysendRequest {
  method: 'keysend'
  params: {
    destination: string
    amount_msat: string
    label?: string
    maxfeepercent?: string
    retry_for?: number
    maxdelay?: string
    exemptfee?: string
  }
}

export type ListfundsRequest = {
  method: 'listfunds'
}

export type LNRequest =
  | PayRequest
  | GetinfoRequest
  | ListinvoicesRequest
  | ListpaysRequest
  | InvoiceRequest
  | WaitInvoiceRequest
  | WaitAnyInvoiceRequest
  | KeysendRequest
  | ListfundsRequest

// ==== RESPONSES ==== //
export interface GetinfoResponse {
  /**
   * The addresses we announce to the world
   */
  address?: Address[]
  /**
   * The fun alias this node will advertize
   */
  alias: string
  /**
   * The addresses we are listening on
   */
  binding?: Binding[]
  /**
   * The highest block height we've learned
   */
  blockheight: number
  /**
   * The favorite RGB color this node will advertize
   */
  color: string
  /**
   * Total routing fees collected by this node
   */
  fees_collected_msat: number
  /**
   * The public key unique to this node
   */
  id: string
  /**
   * Identifies where you can find the configuration and other related files
   */
  'lightning-dir': string
  /**
   * represents the type of network on the node are working (e.g: `bitcoin`, `testnet`, or
   * `regtest`)
   */
  network: string
  /**
   * The total count of channels in normal state
   */
  num_active_channels: number
  /**
   * The total count of channels waiting for opening or closing transactions to be mined
   */
  num_inactive_channels: number
  /**
   * The total count of peers, connected or with channels
   */
  num_peers: number
  /**
   * The total count of channels being opened
   */
  num_pending_channels: number
  /**
   * Identifies what bugs you are running into
   */
  version: string
  /**
   * Bitcoind is not up-to-date with network.
   */
  warning_bitcoind_sync?: string
  /**
   * Lightningd is still loading latest blocks from bitcoind.
   */
  warning_lightningd_sync?: string
}

export type Address = {
  /**
   * port number
   */
  port: number
  /**
   * Type of connection
   */
  type: AddressType
}

/**
 * Type of connection
 */
export enum AddressType {
  DNS = 'dns',
  Ipv4 = 'ipv4',
  Ipv6 = 'ipv6',
  Torv2 = 'torv2',
  Torv3 = 'torv3',
  Websocket = 'websocket'
}

export type Binding = {
  /**
   * address in expected format for **type**
   */
  address?: string
  /**
   * port number
   */
  port?: number
  /**
   * socket filename (only if **type** is "local socket")
   */
  socket?: string
  /**
   * Type of connection
   */
  type: BindingType
}

/**
 * Type of connection
 */
export enum BindingType {
  Ipv4 = 'ipv4',
  Ipv6 = 'ipv6',
  LocalSocket = 'local socket',
  Torv2 = 'torv2',
  Torv3 = 'torv3'
}

export type InvoiceResponse = {
  /**
   * the bolt11 string
   */
  bolt11: string
  /**
   * UNIX timestamp of when invoice expires
   */
  expires_at: number
  /**
   * the hash of the *payment_preimage* which will prove payment
   */
  payment_hash: string
  /**
   * the *payment_secret* to place in the onion
   */
  payment_secret: string
  /**
   * even using all possible channels, there's not enough incoming capacity to pay this
   * invoice.
   */
  warning_capacity?: string
  /**
   * there would be enough incoming capacity, but some channels are dead-ends (no other public
   * channels from those peers), so there isn't.
   */
  warning_deadends?: string
  /**
   * there is sufficient capacity, but not in a single channel, so the payer will have to use
   * multi-part payments.
   */
  warning_mpp?: string
  /**
   * there would be enough incoming capacity, but some channels are offline, so there isn't.
   */
  warning_offline?: string
  /**
   * there would be enough incoming capacity, but some channels are unannounced and
   * *exposeprivatechannels* is *false*, so there isn't.
   */
  warning_private_unused?: string
}

export type PayResponse = {
  /**
   * Amount the recipient received
   */
  amount_msat: string
  /**
   * Total amount we sent (including fees)
   */
  amount_sent_msat: string
  /**
   * the UNIX timestamp showing when this payment was initiated
   */
  created_at: number
  /**
   * the final destination of the payment
   */
  destination?: string
  /**
   * how many attempts this took
   */
  parts: number
  /**
   * the hash of the *payment_preimage* which will prove payment
   */
  payment_hash: string
  /**
   * the proof of payment: SHA256 of this **payment_hash**
   */
  payment_preimage: string
  /**
   * status of payment
   */
  status: PaymentStatus
  /**
   * Not all parts of a multi-part payment have completed
   */
  warning_partial_completion?: string
}

/**
 * status of payment
 */
export enum PaymentStatus {
  Complete = 'complete',
  Failed = 'failed',
  Pending = 'pending'
}

export type ListpaysResponse = {
  pays: Pay[]
}

export type Pay = {
  /**
   * the bolt11 string (if pay supplied one)
   */
  bolt11?: string
  /**
   * the bolt12 string (if supplied for pay: **experimental-offers** only).
   */
  bolt12?: string
  /**
   * the UNIX timestamp showing when this payment was initiated
   */
  created_at: number
  /**
   * the description matching the bolt11 description hash (if pay supplied one)
   */
  description?: string
  /**
   * the final destination of the payment if known
   */
  destination?: string
  preimage: string
  amount_msat: string | number
  amount_sent_msat: string | number
  /**
   * the label, if given to sendpay
   */
  label?: string
  /**
   * the hash of the *payment_preimage* which will prove payment
   */
  payment_hash: string
  /**
   * status of the payment
   */
  status: PaymentStatus
}

export type KeysendResponse = {
  /**
   * Amount the recipient received
   */
  amount_msat: string
  /**
   * Total amount we sent (including fees)
   */
  amount_sent_msat: string
  /**
   * the UNIX timestamp showing when this payment was initiated
   */
  created_at: number
  /**
   * the final destination of the payment
   */
  destination?: string
  /**
   * how many attempts this took
   */
  parts: number
  /**
   * the hash of the *payment_preimage* which will prove payment
   */
  payment_hash: string
  /**
   * the proof of payment: SHA256 of this **payment_hash**
   */
  payment_preimage: string
  /**
   * status of payment
   */
  status: PaymentStatus
  /**
   * Not all parts of a multi-part payment have completed
   */
  warning_partial_completion?: string
}

export type ListfundsResponse = {
  channels: Channel[]
  outputs: Output[]
}

export type Channel = {
  /**
   * total channel value
   */
  amount_msat: string | number
  /**
   * whether the channel peer is connected
   */
  connected: boolean
  /**
   * the 0-based index of the output in the funding transaction
   */
  funding_output: number
  /**
   * funding transaction id
   */
  funding_txid: string
  /**
   * available satoshis on our node’s end of the channel
   */
  our_amount_msat: string | number
  /**
   * the peer with which the channel is opened
   */
  peer_id: string
  /**
   * the channel state, in particular "CHANNELD_NORMAL" means the channel can be used normally
   */
  state: State
}

/**
 * the channel state, in particular "CHANNELD_NORMAL" means the channel can be used normally
 */
export enum State {
  AwaitingUnilateral = 'AWAITING_UNILATERAL',
  ChanneldAwaitingLockin = 'CHANNELD_AWAITING_LOCKIN',
  ChanneldNormal = 'CHANNELD_NORMAL',
  ChanneldShuttingDown = 'CHANNELD_SHUTTING_DOWN',
  ClosingdComplete = 'CLOSINGD_COMPLETE',
  ClosingdSigexchange = 'CLOSINGD_SIGEXCHANGE',
  DualopendAwaitingLockin = 'DUALOPEND_AWAITING_LOCKIN',
  DualopendOpenInit = 'DUALOPEND_OPEN_INIT',
  FundingSpendSeen = 'FUNDING_SPEND_SEEN',
  Onchain = 'ONCHAIN',
  Openingd = 'OPENINGD'
}

export type Output = {
  /**
   * the bitcoin address of the output
   */
  address?: string
  /**
   * the amount of the output
   */
  amount_msat: number
  /**
   * the index within *txid*
   */
  output: number
  /**
   * the redeemscript, only if it's p2sh-wrapped
   */
  redeemscript?: string
  /**
   * the scriptPubkey of the output
   */
  scriptpubkey: string
  status: OutputStatus
  /**
   * the ID of the spendable transaction
   */
  txid: string
  reserved: boolean
}

export enum OutputStatus {
  Confirmed = 'confirmed',
  Spent = 'spent',
  Unconfirmed = 'unconfirmed'
}

export type ListinvoicesResponse = {
  invoices: Invoice[]
}

export type Invoice = {
  /**
   * the amount required to pay this invoice
   */
  amount_msat?: number
  /**
   * the BOLT11 string (always present unless *bolt12* is)
   */
  bolt11?: string
  /**
   * the BOLT12 string (always present unless *bolt11* is)
   */
  bolt12?: string
  /**
   * description used in the invoice
   */
  description: string
  /**
   * UNIX timestamp of when it will become / became unpayable
   */
  expires_at: number
  /**
   * unique label supplied at invoice creation
   */
  label: string
  /**
   * the *id* of our offer which created this invoice (**experimental-offers** only).
   */
  local_offer_id?: string
  /**
   * the optional *payer_note* from invoice_request which created this invoice
   * (**experimental-offers** only).
   */
  payer_note?: string
  /**
   * the hash of the *payment_preimage* which will prove payment
   */
  payment_hash: string
  /**
   * Whether it's paid, unpaid or unpayable
   */
  status: InvoiceStatus
  amount_received_msat?: string
  pay_index?: number
  paid_at?: number
  payment_preimage?: string
}

/**
 * Whether it's paid, unpaid or unpayable
 */
export enum InvoiceStatus {
  Expired = 'expired',
  Paid = 'paid',
  Unpaid = 'unpaid'
}

export type ErrorResponse = {
  code: number
  message: string
}

export type WaitInvoiceResponse = Invoice
export type WaitAnyInvoiceResponse = Invoice

export type LNResponse =
  | InvoiceResponse
  | ListinvoicesResponse
  | ListfundsResponse
  | ListpaysResponse
  | PayResponse
  | GetinfoResponse
  | KeysendResponse
  | WaitInvoiceResponse
  | WaitAnyInvoiceResponse

export type RpcRequest = (req: JsonRpcRequest & { rune: string }) => Promise<unknown>
