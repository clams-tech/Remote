import type { Channel } from '$lib/@types/channels.js'
import { convertVersionNumber, formatMsat } from '$lib/utils.js'
import type { ChannelsInterface } from '../interfaces.js'
import handleError from './error.js'

import type {
  BkprChannelsAPYResponse,
  BkprListBalancesResponse,
  CorelnConnectionInterface,
  CoreLnError,
  ListPeersResponse
} from './types.js'

class Channels implements ChannelsInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  async get(): Promise<Channel[]> {
    try {
      // @TODO - Need to check version as listpeers channel info is deprecated as of 23.11
      const versionNumber = convertVersionNumber(this.connection.info.version)

      const listPeersResult = await this.connection.rpc({ method: 'listpeers' })

      const { peers } = listPeersResult as ListPeersResponse

      return peers.flatMap(({ id, channels }) => {
        return channels.map((channel) => {
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
            feePpm: channel.fee_proportional_millionths,
            closeToAddress: channel.close_to_addr ?? null,
            closeToScriptPubkey: channel.close_to ?? null,
            closer: channel.closer,
            nodeId: this.connection.info.id
          }
        })
      })
    } catch (error) {
      const context = 'get (channels)'
      throw handleError(error as CoreLnError, context)
    }
  }
}

export default Channels
