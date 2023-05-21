import type { Channel } from '$lib/@types/channels.js'
import type { Node } from '$lib/@types/nodes.js'
import { formatMsat } from '$lib/utils.js'
import type {
  BkprChannelsAPYResponse,
  BkprListBalancesResponse,
  ListPeersResponse,
  RpcCall
} from './types.js'

const channels = (rpc: RpcCall, node: Node) => {
  /** Get all channels */
  const get = async (): Promise<Channel[]> => {
    // @TODO - Need to check version as listpeers channel info is deprecated as of 23.11
    const { peers } = (await rpc({ method: 'listpeers' })) as ListPeersResponse
    const { channels_apy } = (await rpc({ method: 'bkpr-channelsapy' })) as BkprChannelsAPYResponse
    const { accounts } = (await rpc({ method: 'bkpr-listbalances' })) as BkprListBalancesResponse

    return peers.flatMap(({ id, channels }) => {
      return channels.map((channel) => {
        const channelAPYMatch = channels_apy.find(
          (channelAPY) => channelAPY.account === channel.channel_id
        )

        const balanceMatch = accounts.find((balance) => balance.account === channel.channel_id)

        return {
          opener: channel.opener,
          peerId: id,
          fundingTransactionId: channel.funding_txid || null,
          fundingOutput: channel.funding_outnum || null,
          id: channel.channel_id || null,
          shortId: channel.short_channel_id || null,
          status: channel.state,
          balanceLocal: formatMsat(channel.to_us_msat),
          balanceRemote: (
            BigInt(formatMsat(channel.total_msat)) - BigInt(formatMsat(channel.to_us_msat))
          ).toString(),
          balanceTotal: formatMsat(channel.total_msat),
          balanceSendable: formatMsat(channel.spendable_msat),
          balanceReceivable: formatMsat(channel.receivable_msat),
          feeBase: formatMsat(channel.fee_base_msat.toString()),
          routingFees: channelAPYMatch?.fees_out_msat.toString() || null,
          routedOut: (channelAPYMatch?.routed_out_msat as string) || null,
          routedIn: (channelAPYMatch?.routed_in_msat as string) || null,
          apy: channelAPYMatch?.apy_out ?? null,
          closeToAddress: channel.close_to_addr ?? null,
          closer: channel.closer ?? null,
          resolved: balanceMatch?.account_resolved ?? null,
          resolvedAtBlock: balanceMatch?.resolved_at_block ?? null,
          nodeId: node.id
        }
      })
    })
  }

  return {
    get
  }
}

export default channels
