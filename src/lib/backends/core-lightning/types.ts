import type { GenesisBlockhash } from '$lib/types'
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

export type FetchInvoiceRequest = {
  method: 'fetchinvoice'
  params: {
    offer: string
    amount_msat?: string
    quantity?: number
    recurrence_counter?: number
    recurrence_start?: number
    recurrence_label?: string
    timeout?: number
    payer_note?: string
  }
}

export type SendInvoiceRequest = {
  method: 'sendinvoice'
  params: {
    offer: string
    label: string
    amount_msat?: string
    quantity?: number
    timeout?: number
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

export type SignMessageRequest = {
  method: 'signmessage'
  params: {
    message: string
  }
}

export type DecodeRequest = {
  method: 'decode'
  params: string[]
}

export type ListOffersRequest = {
  method: 'listoffers'
}

export type ListInvoiceRequestsRequest = {
  method: 'listinvoicerequests'
}

export type CreatePayOfferRequest = {
  method: 'offer'
  params: {
    amount: string
    description: string
    issuer?: string
    label?: string
    quantity_max?: number
    absolute_expiry?: number
    recurrence?: string
    recurrence_base?: string
    recurrence_paywindow?: string
    recurrence_limit?: string
    single_use?: boolean
  }
}

export type CreateWithdrawOfferRequest = {
  method: 'invoicerequest'
  params: {
    amount: string
    description: string
    issuer?: string
    label?: string
    absolute_expiry?: number
    single_use?: boolean
  }
}

export type DisableOfferRequest = {
  method: 'disableoffer'
  params: {
    offer_id: string
  }
}

export type DisableInvoiceRequestRequest = {
  method: 'disableinvoicerequest'
  params: {
    invreq_id: string
  }
}

export type LNRequest =
  | PayRequest
  | FetchInvoiceRequest
  | SendInvoiceRequest
  | GetinfoRequest
  | ListinvoicesRequest
  | ListpaysRequest
  | InvoiceRequest
  | WaitInvoiceRequest
  | WaitAnyInvoiceRequest
  | KeysendRequest
  | ListfundsRequest
  | SignMessageRequest
  | DecodeRequest
  | ListOffersRequest
  | ListInvoiceRequestsRequest
  | CreatePayOfferRequest
  | CreateWithdrawOfferRequest
  | DisableOfferRequest
  | DisableInvoiceRequestRequest

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
  amount_msat: string | number
  /**
   * Total amount we sent (including fees)
   */
  amount_sent_msat: string | number
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
  amount_msat?: number | string
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
  amount_received_msat?: string | number
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

export type SignMessageResponse = {
  /** (hex): The signature (always 128 characters) */
  signature: string
  /** (hex): The recovery id (0, 1, 2 or 3) (always 2 characters) */
  recid: string
  /** signature and recid encoded in a style compatible with lnd’s SignMessageRequest */
  zbase: string
}

export type IncomeEvent = {
  account: string
  tag: 'deposit' | 'withdrawal' | 'onchain_fee' | 'invoice' | 'invoice_fee' | 'routed' | string
  credit_msat: number | string
  debit_msat: number | string
  currency: string
  timestamp: number
  description?: string
  outpoint?: string
  txid?: string
  payment_id?: string
  fee_amount?: string
}

export type BkprListIncomeResponse = {
  income_events: IncomeEvent[]
}

export type ChannelAPY = {
  account: 'net' | string
  routed_out_msat: number | string
  routed_in_msat: number | string
  lease_fee_paid_msat: number | string
  lease_fee_earned_msat: number | string
  pushed_out_msat: number | string
  pushed_in_msat: number | string
  our_start_balance_msat: number | string
  channel_start_balance_msat: number | string
  fees_out_msat: number | string
  fees_in_msat: number | string
  utilization_out: string
  utilization_out_initial?: string
  utilization_in: string
  utilization_in_initial?: string
  apy_out: string
  apy_out_initial: string
  apy_in: string
  apy_in_initial: string
  apy_total: string
  apy_total_initial: string
  apy_lease?: string
}

export type BkprChannelsAPYResponse = {
  channels_apy: ChannelAPY[]
}

export type ListNode = {
  nodeid: string
  alias: string
  color: string
  last_timestamp: number
  features: string
  addresses: [
    {
      type: string
      address: string
      port: number
    }
  ]
}

export type ListNodesResponse = {
  nodeid: string
  alias: string
  color: string
  last_timestamp: number
  features: string
  addresses: [
    {
      type: string
      address: string
      port: number
    }
  ]
}[]

export type DecodedBolt11 = {
  currency: string
  created_at: number
  expiry: number
  payee: string
  payment_hash: string
  signature: string
  min_final_cltv_expiry: number
  amount_msat?: number | string
  description?: string
  description_hash?: string
  payment_secret?: string
  features?: string
  payment_metadata?: string
}

export type DecodedType =
  | 'bolt12 offer'
  | 'bolt12 invoice'
  | 'bolt12 invoice_request'
  | 'bolt11 invoice'

export type DecodedCommon = {
  type: DecodedType
  valid: boolean
}

export type TLV = {
  type: number
  length: number
  value: string
}

export type OfferCommon = {
  offer_id: string
  offer_description: string
  offer_node_id: string
  offer_chains?: GenesisBlockhash[]
  offer_metadata?: string
  offer_currency?: string
  currency_minor_unit?: number
  offer_amount?: string | number
  offer_amount_msat?: string | number
  offer_issuer?: string
  offer_features?: string
  offer_absolute_expiry?: number
  offer_quantity_max?: number
  offer_recurrence?: {
    time_unit: number
    period: number
    time_unit_name?: string
    basetime?: number
    start_any_period?: number
    limit?: number
    paywindow?: {
      seconds_before: number
      seconds_after: number
      proportional_amount?: boolean
    }
  }
  warning_unknown_offer_currency?: number
}

export type DecodedBolt12Offer = DecodedCommon &
  OfferCommon & {
    unknown_offer_tlvs?: TLV[]
  }

export type Bolt12InvoiceCommon = {
  invreq_metadata: string
  invreq_payer_id: string
  invoice_created_at: number
  invoice_payment_hash: string
  invoice_amount_msat: string | number
  signature: string
  invreq_chain?: string
  invreq_amount_msat?: string | number
  invreq_amount?: string | number
  invreq_features?: string
  invreq_quantity?: number
  invreq_payer_note?: string
  invreq_recurrence_counter?: number
  invreq_recurrence_start?: number
}

export type DecodedBolt12Invoice = DecodedCommon &
  Omit<OfferCommon, 'offer_id'> &
  Bolt12InvoiceCommon & {
    invoice_relative_expiry?: number
    invoice_fallbacks: {
      version: number
      hex: string
      address?: string
    }[]
    invoice_features?: string
    invoice_node_id?: string
    invoice_recurrence_basetime?: number
    unknown_invoice_tlvs?: TLV[]
  }

export type DecodedBolt12InvoiceRequest = DecodedCommon &
  Omit<OfferCommon, 'offer_id'> &
  Bolt12InvoiceCommon & {
    invreq_id: string
    unknown_invoice_request_tlvs: TLV[]
  }

export type DecodeResponse = DecodedBolt12Offer | DecodedBolt12Invoice | DecodedBolt12InvoiceRequest

export type FetchInvoiceResponse = {
  /**The BOLT12 invoice we fetched */
  invoice: string
  changes: {
    /**extra characters appended to the description field. */
    description_appended?: string
    /**a completely replaced description field */
    description?: string
    /**The vendor from the offer, which is missing in the invoice */
    vendor_removed?: string
    /**a completely replaced vendor field */
    vendor?: string
    /**the amount, if different from the offer amount multiplied by any quantity (or the offer had no amount, or was not in BTC). */
    amount_msat?: string
  }
  /**Only for recurring invoices if the next period is under the recurrence_limit: */
  next_period?: {
    /**the index of the next period to fetchinvoice */
    counter: number
    /**UNIX timestamp that the next period starts */
    starttime: number
    /**UNIX timestamp that the next period ends */
    endtime: number
    /**UNIX timestamp of the earliest time that the next invoice can be fetched */
    paywindow_start: number
    /**UNIX timestamp of the latest time that the next invoice can be fetched */
    paywindow_end: number
  }
}

export type SendInvoiceResponse = {
  label: string
  description: string
  payment_hash: string
  status: string
  expires_at: number
  amount_msat?: string
  bolt12?: string
  pay_index?: number
  amount_received_msat?: string
  paid_at?: number
  payment_preimage?: string
}

export type OfferSummaryCommon = {
  /**whether this can still be used */
  active: boolean
  /**whether this expires as soon as it’s paid */
  single_use: boolean
  /**the bolt12 encoding of the offer */
  bolt12: string
  /**True if an associated invoice has been paid */
  used: boolean
  /**the (optional) user-specified label */
  label?: string
}

export type OfferSummary = OfferSummaryCommon & {
  /**the id of this offer (merkle hash of non-signature fields) */
  offer_id: string
}

export type InvoiceRequestSummary = OfferSummaryCommon & {
  /**the id of this offer (merkle hash of non-signature fields) */
  invreq_id: string
}

export type FormattedOfferSummary = OfferSummaryCommon & {
  id: string
  type: string
}

export type ListOffersResponse = {
  offers: OfferSummary[]
}

export type ListInvoiceRequestsResponse = {
  invoicerequests: InvoiceRequestSummary[]
}

export type CreatePayOfferResponse = OfferSummary & { created: boolean }
export type CreateWithdrawOfferResponse = InvoiceRequestSummary

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
  | SignMessageResponse
  | BkprListIncomeResponse
  | DecodeResponse
  | FetchInvoiceResponse
  | SendInvoiceResponse
  | ListOffersResponse
  | ListInvoiceRequestsResponse
  | CreatePayOfferResponse
  | CreateWithdrawOfferResponse
  | ListNodesResponse

export type RpcRequest = (req: JsonRpcRequest & { rune: string }) => Promise<unknown>
