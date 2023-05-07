import LnMessage from 'lnmessage'
import Big from 'big.js'
import {
  formatDecodedOffer,
  formatMsat,
  now,
  parseNodeAddress,
  sortPaymentsMostRecent
} from '$lib/utils'
import type { Logger } from 'lnmessage/dist/types'
import type { Auth } from '$lib/@types/auth.js'
import type { Node } from '$lib/@types/nodes.js'
import type { Settings } from '$lib/@types/settings.js'
import type { Payment } from '$lib/@types/payments.js'
import type { Channel } from '$lib/@types/channels.js'
import bolt12Decoder from 'bolt12-decoder'

import {
  formatChannelsAPY,
  formatIncomeEvents,
  invoiceStatusToPaymentStatus,
  invoiceToPayment,
  payToPayment
} from './utils'

import type {
  BkprChannelsAPYResponse,
  BkprListBalancesResponse,
  BkprListIncomeResponse,
  ChannelAPY,
  CreatePayOfferRequest,
  CreatePayOfferResponse,
  CreateWithdrawOfferRequest,
  CreateWithdrawOfferResponse,
  DisableInvoiceRequestRequest,
  DisableOfferRequest,
  FetchInvoiceRequest,
  FetchInvoiceResponse,
  GetinfoResponse,
  IncomeEvent,
  InvoiceRequest,
  InvoiceRequestSummary,
  InvoiceResponse,
  InvoiceStatus,
  KeysendResponse,
  ListfundsResponse,
  ListInvoiceRequestsResponse,
  ListinvoicesResponse,
  ListNodesResponse,
  ListOffersResponse,
  ListpaysResponse,
  ListPeersResponse,
  OfferSummary,
  PayResponse,
  SendInvoiceRequest,
  SendInvoiceResponse,
  SignMessageResponse,
  WaitAnyInvoiceResponse,
  WaitInvoiceResponse
} from './types'
import type { Offer } from '$lib/@types/offers.js'
import type { DecodedType } from 'bolt12-decoder/@types/types.js'

type RpcCall = (method: string, params?: unknown) => Promise<unknown>

class RPC {
  public rpc: RpcCall

  constructor(rpc: (method: string, params?: unknown) => Promise<unknown>) {
    this.rpc = rpc
  }
}

class NodeInfo extends RPC {
  constructor(rpc: RpcCall) {
    super(rpc)
  }

  async get(): Promise<Node> {
    const result = await this.rpc('getinfo')
    const { alias, id, version, color, network } = result as GetinfoResponse
    return { alias, id, version, color, network }
  }
}

class Channels extends RPC {
  constructor(rpc: RpcCall) {
    super(rpc)
  }

  async get(): Promise<Channel[]> {
    // @TODO - Implement logic to get channels
  }
}

class Offers extends RPC {
  constructor(rpc: RpcCall) {
    super(rpc)
  }

  async get(): Promise<Offer[]> {
    const [offersResponse, invoiceRequestsResponse] = await Promise.all([
      this.rpc('listoffers'),
      this.rpc('listinvoicerequests')
    ])

    const { offers } = offersResponse as ListOffersResponse
    const { invoicerequests } = invoiceRequestsResponse as ListInvoiceRequestsResponse

    const formatted = [...offers, ...invoicerequests].map((offer) => {
      const { offer_id, bolt12, active, single_use, used, label } = offer as OfferSummary
      const { invreq_id } = offer as InvoiceRequestSummary
      const decoded = bolt12Decoder(bolt12)
      const formatted = formatDecodedOffer({ ...decoded, valid: true, offer_id })

      return {
        ...formatted,
        active,
        single_use,
        used,
        bolt12,
        label,
        id: offer_id || invreq_id,
        type: (offer_id ? 'pay' : 'withdraw') as DecodedType
      }
    })

    return formatted
  }

  async createPay(params: CreatePayOfferRequest['params']): Promise<CreatePayOfferResponse> {
    const result = await this.rpc('offer', params)
    return result as CreatePayOfferResponse
  }

  async createWithdraw(
    params: CreateWithdrawOfferRequest['params']
  ): Promise<CreateWithdrawOfferResponse> {
    const result = await this.rpc('invoicerequest', params)
    return result as CreateWithdrawOfferResponse
  }

  async disablePay(params: DisableOfferRequest['params']): Promise<OfferSummary> {
    const result = await this.rpc('disableoffer', params)
    return result as OfferSummary
  }

  async disableWithdraw(
    params: DisableInvoiceRequestRequest['params']
  ): Promise<InvoiceRequestSummary> {
    const result = await this.rpc('disableinvoicerequest', params)
    return result as InvoiceRequestSummary
  }
}

class CoreLn {
  public connection: LnMessage
  public rune: string
  public rpc: RpcCall

  public node: NodeInfo
  public channels: Channels
  public offers: Offers

  constructor(auth: Auth, settings: Settings, logger?: Logger) {
    const { address, token, sessionSecret } = auth
    const { wsProxy, directConnection } = settings
    const { publicKey, ip, port } = parseNodeAddress(address)

    this.connection = new LnMessage({
      remoteNodePublicKey: publicKey,
      wsProxy: directConnection ? undefined : wsProxy,
      wsProtocol: directConnection,
      ip,
      port: port || 9735,
      privateKey: sessionSecret,
      logger: logger
    })

    this.rune = token

    this.rpc = (method: string, params: unknown): Promise<unknown> => {
      return this.connection.commando({ method, params, rune: this.rune })
    }

    this.node = new NodeInfo(this.rpc)
    this.channels = new Channels(this.rpc)
    this.offers = new Offers(this.rpc)
  }

  setToken(token: string) {
    this.rune = token
  }

  connect() {
    return this.connection.connect()
  }

  disconnect() {
    return this.connection.disconnect()
  }

  // @TODO - Implement the following
  /** Connection status */
  /** getNodeInfo */
  /** getChannels */
  /** getOffers */
  /** getOutputs */
  /** getPayments */
  /** getPeers */

  async createInvoice(params: InvoiceRequest['params']): Promise<Payment> {
    const { label, amount_msat, description } = params
    const startedAt = now()

    const result = await this.connection.commando({
      method: 'invoice',
      params,
      rune: this.rune
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
      nodeId: this.connection.remoteNodePublicKey
    }

    return payment
  }

  async payInvoice(options: {
    /**Can be bolt11 or bolt12 */
    invoice: string
    type: 'bolt11' | 'bolt12'
    id: string
    amount_msat?: string
    description?: unknown
  }): Promise<Payment> {
    const { invoice, type, id, amount_msat: send_msat, description } = options

    const result = await this.connection.commando({
      method: 'pay',
      params: {
        label: id,
        bolt11: invoice,
        amount_msat: send_msat,
        description
      },
      rune: this.rune
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
      completedAt: now(),
      expiresAt: null,
      startedAt: created_at,
      fee: Big(formatMsat(amount_sent_msat)).minus(formatMsat(amount_msat)).toString(),
      status,
      invoice: invoice,
      nodeId: this.connection.remoteNodePublicKey
    }
  }

  async waitForInvoicePayment(payment: Payment): Promise<Payment> {
    const { id } = payment

    const result = await this.connection.commando({
      method: 'waitinvoice',
      params: {
        label: id
      },
      rune: this.rune
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

  async waitAnyInvoice(lastPayIndex?: number, reqId?: string): Promise<WaitAnyInvoiceResponse> {
    const response = await this.connection.commando({
      method: 'waitanyinvoice',
      params: { lastpay_index: lastPayIndex },
      rune: this.rune,
      reqId
    })

    return response as WaitAnyInvoiceResponse
  }

  /**Fetch an invoice for a BOLT12 Offer */
  async fetchInvoice(params: FetchInvoiceRequest['params']): Promise<FetchInvoiceResponse> {
    const result = await this.connection.commando({
      method: 'fetchinvoice',
      params,
      rune: this.rune
    })

    return result as FetchInvoiceResponse
  }

  /**Create an invoice for a BOLT12 Offer and send it to be paid */
  async sendInvoice(params: SendInvoiceRequest['params']): Promise<Payment> {
    const { offer, label, amount_msat, timeout, quantity } = params
    const createdAt = now()

    const orderedParams = amount_msat
      ? [offer, label, amount_msat, timeout, quantity]
      : [offer, label, timeout, quantity]

    const result = await this.connection.commando({
      method: 'sendinvoice',
      params: orderedParams,
      rune: this.rune
    })

    const {
      payment_hash,
      payment_preimage,
      status,
      bolt12,
      expires_at,
      paid_at,
      amount_received_msat,
      pay_index
    } = result as SendInvoiceResponse

    return {
      id: label,
      hash: payment_hash,
      preimage: payment_preimage,
      type: 'bolt12',
      direction: 'receive',
      value: formatMsat((amount_received_msat || amount_msat) as string),
      completedAt: paid_at ? paid_at : now(),
      expiresAt: expires_at,
      startedAt: createdAt,
      fee: null,
      status: invoiceStatusToPaymentStatus(status as InvoiceStatus),
      invoice: bolt12,
      payIndex: pay_index,
      nodeId: this.connection.remoteNodePublicKey
    }
  }

  async payKeysend(options: {
    destination: string
    id: string
    amount_msat: string
  }): Promise<Payment> {
    const { destination: send_destination, id, amount_msat: send_msat } = options

    const result = await this.connection.commando({
      method: 'keysend',
      params: {
        label: id,
        destination: send_destination,
        amount_msat: send_msat
      },
      rune: this.rune
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
      completedAt: now(),
      expiresAt: null,
      startedAt: created_at,
      fee: Big(formatMsat(amount_sent_msat)).minus(amountMsat).toString(),
      status,
      nodeId: this.connection.remoteNodePublicKey
    }
  }

  async getPayments(): Promise<Payment[]> {
    const { invoices } = await this.listInvoices()
    const { pays } = await this.listPays()
    const invoicePayments: Payment[] = await Promise.all(invoices.map(invoiceToPayment))
    const sentPayments: Payment[] = await Promise.all(pays.map(payToPayment))

    return invoicePayments.concat(sentPayments)
  }

  async listInvoices(): Promise<ListinvoicesResponse> {
    const result = await this.connection.commando({ method: 'listinvoices', rune: this.rune })
    return result as ListinvoicesResponse
  }

  async listPays(): Promise<ListpaysResponse> {
    const result = await this.connection.commando({ method: 'listpays', rune: this.rune })
    return result as ListpaysResponse
  }

  async listFunds(): Promise<ListfundsResponse> {
    const result = await this.connection.commando({ method: 'listfunds', rune: this.rune })
    return result as ListfundsResponse
  }

  async signMessage(message: string): Promise<SignMessageResponse> {
    const result = await this.connection.commando({
      method: 'signmessage',
      rune: this.rune,
      params: { message }
    })

    return result as SignMessageResponse
  }

  async bkprListIncome(): Promise<IncomeEvent[]> {
    const result = (await this.connection.commando({
      method: 'bkpr-listincome',
      rune: this.rune
    })) as BkprListIncomeResponse

    const formatted = formatIncomeEvents(result.income_events)

    return formatted
  }

  async bkprListBalances(): Promise<BkprListBalancesResponse['accounts']> {
    const result = await this.connection.commando({
      method: 'bkpr-listbalances',
      rune: this.rune
    })

    return (result as BkprListBalancesResponse).accounts
  }

  async bkprChannelsAPY(): Promise<ChannelAPY[]> {
    const result = (await this.connection.commando({
      method: 'bkpr-channelsapy',
      rune: this.rune
    })) as BkprChannelsAPYResponse

    const formatted = formatChannelsAPY(result.channels_apy)

    return formatted
  }

  async listNodes(id: string): Promise<ListNodesResponse['nodes']> {
    const result = (await this.connection.commando({
      method: 'listnodes',
      rune: this.rune,
      params: { id }
    })) as ListNodesResponse

    return (result as ListNodesResponse).nodes
  }

  async listPeers(): Promise<ListPeersResponse['peers']> {
    const result = await this.connection.commando({
      method: 'listpeers',
      rune: this.rune
    })

    return (result as ListPeersResponse).peers
  }

  async getChannels(): Promise<Channel[]> {
    const channels: Channel[] = []
    const peers = await this.listPeers()
    const channelsAPY = await this.bkprChannelsAPY()
    const balances = await this.bkprListBalances()

    function chunkArray<T>(arr: T[], size: number): T[][] {
      // Create an array to hold the chunks
      const chunkedArr: T[][] = []
      // Loop over each item in the array
      for (const item of arr) {
        // If the last chunk is full (or doesn't exist), create a new chunk with this item
        if (!chunkedArr.length || chunkedArr[chunkedArr.length - 1].length === size) {
          chunkedArr.push([item])
        } else {
          // Otherwise, add the item to the last chunk
          chunkedArr[chunkedArr.length - 1].push(item)
        }
      }
      // Return the array of chunks
      return chunkedArr
    }

    // msat is appended to some values in later versions of CLN
    function trimMsat(value: string | number): string {
      if (value.toString().endsWith('msat')) {
        return value.toString().slice(0, -4)
      } else {
        return value.toString()
      }
    }

    // Chunk the peers array into smaller arrays of size 50
    const peerChunks = chunkArray(peers, 50)

    // Loop over the chunked arrays of peers
    for (const chunk of peerChunks) {
      // Make API calls for each chunk of peers in parallel
      const promises = chunk.map(async (peer) => {
        const nodes = await this.listNodes(peer.id)
        const node = nodes[0]

        peer.channels?.forEach((channel) => {
          const channelAPYMatch = channelsAPY.find(
            (channelAPY) => channelAPY.account === channel.channel_id
          )
          const balanceMatch = balances.find((balance) => balance.account === channel.channel_id)

          channels.push({
            opener: channel.opener,
            peerId: peer.id,
            peerAlias: node?.alias ?? null,
            fundingTransactionId: channel.funding_txid ?? null,
            fundingOutput: channel.funding_outnum ?? null,
            id: channel.channel_id ?? null,
            shortId: channel.short_channel_id ?? null,
            status: channel.state,
            balanceLocal: trimMsat(channel.to_us_msat) ?? null,
            balanceRemote:
              (
                BigInt(trimMsat(channel.total_msat)) - BigInt(trimMsat(channel.to_us_msat))
              ).toString() ?? null,
            balanceTotal: trimMsat(channel.total_msat) ?? null,
            balanceSendable: trimMsat(channel.spendable_msat) ?? null,
            balanceReceivable: trimMsat(channel.receivable_msat) ?? null,
            feeBase: trimMsat(channel.fee_base_msat.toString()) ?? null,
            routingFees: channelAPYMatch?.fees_out_msat.toString() ?? null,
            apy: channelAPYMatch?.apy_out ?? null,
            closeToAddress: channel.close_to_addr ?? null,
            closer: channel.closer ?? null,
            resolved: balanceMatch?.account_resolved ?? null,
            resolvedAtBlock: balanceMatch?.resolved_at_block ?? null,
            nodeId: this.connection.remoteNodePublicKey
          })
        })
      })

      // Wait for all API calls for the current chunk to complete before processing the next chunk
      await Promise.all(promises)
    }

    return channels
  }
}

export default CoreLn
