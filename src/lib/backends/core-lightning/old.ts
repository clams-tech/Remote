import LnMessage from 'lnmessage'

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

class Channels extends RPC {
  constructor(rpc: RpcCall) {
    super(rpc)
  }

  async get(): Promise<Channel[]> {
    // @TODO - Implement logic to get channels
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

    this.node = new NodeInfo(this.connection, this.rune)
    this.channels = new Channels(this.connection, this.rune)
    this.offers = new Offers(this.connection, this.rune)
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
