import { convertVersionNumber, stripMsatSuffix } from './utils.js'
import type { ChannelsInterface } from '../interfaces.js'
import handleError from './error.js'
import { stateToChannelStatus } from './utils.js'

import type {
  Channel,
  ConnectPeerOptions,
  OpenChannelOptions,
  OpenChannelResult,
  UpdateChannelOptions
} from '$lib/@types/channels.js'

import type {
  CorelnConnectionInterface,
  CoreLnError,
  FundChannelResponse,
  ListNodesResponse,
  ListPeerChannelsResponse,
  ListPeersResponse
} from './types.js'

class Channels implements ChannelsInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  public async get(nodeId?: string, channelId?: string): Promise<Channel[]> {
    try {
      const { version } = await this.connection.info
      const versionNumber = convertVersionNumber(version)

      if (versionNumber < 2305) {
        const listPeersResult = await this.connection.rpc({
          method: 'listpeers',
          params: nodeId ? { id: nodeId } : undefined
        })
        const { peers } = listPeersResult as ListPeersResponse

        const result = await Promise.all(
          peers
            .filter(({ channels }) => !!channels)
            .map(async ({ id, channels, connected }) => {
              const {
                nodes: [peer]
              } = (await this.connection.rpc({
                method: 'listnodes',
                params: { id }
              })) as ListNodesResponse

              return channels.map((channel) => {
                const {
                  opener,
                  funding_txid,
                  funding_outnum,
                  channel_id,
                  short_channel_id,
                  state,
                  to_us_msat,
                  total_msat,
                  our_reserve_msat,
                  their_reserve_msat,
                  fee_base_msat,
                  fee_proportional_millionths,
                  close_to_addr,
                  close_to,
                  closer,
                  htlcs,
                  minimum_htlc_out_msat,
                  maximum_htlc_out_msat
                } = channel

                return {
                  opener: opener,
                  peerId: id,
                  peerConnected: connected,
                  peerAlias: peer?.alias,
                  fundingTransactionId: funding_txid,
                  fundingOutput: funding_outnum,
                  id: channel_id,
                  shortId: short_channel_id || null,
                  status: stateToChannelStatus(state),
                  balanceLocal: stripMsatSuffix(to_us_msat),
                  balanceRemote: (
                    BigInt(stripMsatSuffix(total_msat)) - BigInt(stripMsatSuffix(to_us_msat))
                  ).toString(),
                  reserveRemote: stripMsatSuffix(our_reserve_msat || '0'),
                  reserveLocal: stripMsatSuffix(their_reserve_msat || '0'),
                  feeBase: stripMsatSuffix(fee_base_msat.toString()),
                  feePpm: fee_proportional_millionths,
                  closeToAddress: close_to_addr ?? null,
                  closeToScriptPubkey: close_to ?? null,
                  closer,
                  htlcMin: minimum_htlc_out_msat?.toString() || null,
                  htlcMax: maximum_htlc_out_msat?.toString() || null,
                  htlcs: htlcs.map(
                    ({ direction, id, amount_msat, expiry, payment_hash, state }) => ({
                      id,
                      direction,
                      amount: stripMsatSuffix(amount_msat),
                      expiry,
                      paymentHash: payment_hash,
                      state
                    })
                  )
                }
              })
            })
        )

        const flattened = result.flat()

        return channelId ? flattened.filter(({ id }) => id === channelId) : flattened
      } else {
        const listPeerChannelsResult = await this.connection.rpc({
          method: 'listpeerchannels',
          params: nodeId ? { id: nodeId } : undefined
        })

        const { channels } = listPeerChannelsResult as ListPeerChannelsResponse

        const formattedChannels = await Promise.all(
          channels.map(async (channel) => {
            const {
              peer_id,
              peer_connected,
              opener,
              funding_txid,
              funding_outnum,
              channel_id,
              short_channel_id,
              state,
              to_us_msat,
              total_msat,
              fee_base_msat,
              fee_proportional_millionths,
              close_to_addr,
              close_to,
              closer,
              our_reserve_msat,
              their_reserve_msat,
              htlcs,
              minimum_htlc_out_msat,
              maximum_htlc_out_msat
            } = channel

            const {
              nodes: [peer]
            } = (await this.connection.rpc({
              method: 'listnodes',
              params: { id: peer_id }
            })) as ListNodesResponse

            return {
              opener: opener,
              peerId: peer_id,
              peerConnected: peer_connected,
              peerAlias: peer?.alias,
              fundingTransactionId: funding_txid,
              fundingOutput: funding_outnum,
              id: channel_id,
              shortId: short_channel_id || null,
              status: stateToChannelStatus(state),
              balanceLocal: stripMsatSuffix(to_us_msat),
              balanceRemote: (
                BigInt(stripMsatSuffix(total_msat)) - BigInt(stripMsatSuffix(to_us_msat))
              ).toString(),
              reserveRemote: stripMsatSuffix(our_reserve_msat || '0'),
              reserveLocal: stripMsatSuffix(their_reserve_msat || '0'),
              feeBase: fee_base_msat ? stripMsatSuffix(fee_base_msat.toString()) : null,
              feePpm: fee_proportional_millionths,
              closeToAddress: close_to_addr ?? null,
              closeToScriptPubkey: close_to ?? null,
              closer: closer,
              htlcMin: minimum_htlc_out_msat?.toString() || null,
              htlcMax: maximum_htlc_out_msat?.toString() || null,
              htlcs: htlcs.map(({ direction, id, amount_msat, expiry, payment_hash, state }) => ({
                id,
                direction,
                amount: stripMsatSuffix(amount_msat),
                expiry,
                paymentHash: payment_hash,
                state
              }))
            }
          })
        )

        return channelId
          ? formattedChannels.filter(({ id }) => id === channelId)
          : formattedChannels
      }
    } catch (error) {
      const context = 'get (channels)'

      const connectionError = handleError(
        error as CoreLnError,
        context,
        this.connection.info.connectionId
      )

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }

  public async update(options: UpdateChannelOptions): Promise<void> {
    try {
      const { id, feeBase, feeRate, htlcMin, htlcMax, enforceDelay } = options

      await this.connection.rpc({
        method: 'setchannel',
        params: {
          id,
          feebase: feeBase,
          feeppm: feeRate,
          htlcmin: htlcMin,
          htlcmax: htlcMax,
          enforcedelay: enforceDelay
        }
      })
    } catch (error) {
      const context = 'update (channels)'

      const connectionError = handleError(
        error as CoreLnError,
        context,
        this.connection.info.connectionId
      )

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }

  public async connect(options: ConnectPeerOptions): Promise<void> {
    try {
      const { id, host, port } = options

      await this.connection.rpc({
        method: 'connect',
        params: {
          id,
          host,
          port: port || (host ? 9735 : undefined)
        }
      })
    } catch (error) {
      const context = 'connect (channels)'

      const connectionError = handleError(
        error as CoreLnError,
        context,
        this.connection.info.connectionId
      )

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }

  public async open(options: OpenChannelOptions): Promise<OpenChannelResult> {
    try {
      const { id, amount, announce } = options

      const result = await this.connection.rpc({
        method: 'fundchannel',
        params: { id, amount, announce }
      })

      const { tx, txid, outnum, channel_id } = result as FundChannelResponse

      return { tx, txid, txout: outnum, id: channel_id }
    } catch (error) {
      const context = 'open (channels)'

      const connectionError = handleError(
        error as CoreLnError,
        context,
        this.connection.info.connectionId
      )

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }
}

export default Channels
