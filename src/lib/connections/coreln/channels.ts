import type { Channel } from '$lib/@types/channels.js'
import { convertVersionNumber, formatMsat } from '$lib/utils.js'
import type { ChannelsInterface, CorelnConnectionInterface } from '../interfaces.js'

import type {
  BkprChannelsAPYResponse,
  BkprListBalancesResponse,
  ListPeersResponse
} from './types.js'

class Channels implements ChannelsInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  async get(): Promise<Channel[]> {
    // @TODO - Need to check version as listpeers channel info is deprecated as of 23.11
    const versionNumber = convertVersionNumber(this.connection.info.version)

    const [listPeersResult, bkprChannelsResult, bkprBalancesResult] = await Promise.all([
      this.connection.rpc({ method: 'listpeers' }),
      this.connection.rpc({ method: 'bkpr-channelsapy' }),
      this.connection.rpc({ method: 'bkpr-listbalances' })
    ])

    const { peers } = listPeersResult as ListPeersResponse
    const { channels_apy } = bkprChannelsResult as BkprChannelsAPYResponse
    const { accounts } = bkprBalancesResult as BkprListBalancesResponse

    return peers.flatMap(({ id, channels }) => {
      return channels.map((channel) => {
        const channelAPYMatch = channels_apy.find(
          (channelAPY) => channelAPY.account === channel.channel_id
        )

        const balanceMatch = accounts.find((balance) => balance.account === channel.channel_id)

        return {
          opener: channel.opener,
          peerId: id,
          fundingTransactionId: channel.funding_txid,
          fundingOutput: channel.funding_outnum,
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
          routingFees: channelAPYMatch?.fees_out_msat.toString() || '0',
          routedOut: (channelAPYMatch?.routed_out_msat as string) || '0',
          routedIn: (channelAPYMatch?.routed_in_msat as string) || '0',
          apy: channelAPYMatch?.apy_out ?? null,
          closeToAddress: channel.close_to_addr ?? null,
          closer: channel.closer ?? null,
          resolved: balanceMatch?.account_resolved ?? null,
          resolvedAtBlock: balanceMatch?.resolved_at_block ?? null,
          nodeId: this.connection.info.id
        }
      })
    })
  }
}

export default Channels
