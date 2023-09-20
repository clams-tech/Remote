import { convertVersionNumber, formatMsatString } from './utils.js'
import type { ChannelsInterface } from '../interfaces.js'
import handleError from './error.js'
import { stateToChannelStatus } from './utils.js'
import { msatsToSats, satsToMsats } from '$lib/conversion.js'
import Big from 'big.js'
import { log } from '$lib/services.js'

import type {
  Channel,
  ConnectPeerOptions,
  OpenChannelOptions,
  OpenChannelResult,
  UpdateChannelOptions
} from '$lib/@types/channels.js'

import type {
  ClosedChannel,
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

  public async get(channel?: { id: string; peerId: string }): Promise<Channel[]> {
    try {
      const { version } = await this.connection.info
      const versionNumber = convertVersionNumber(version as string)

      let closedChannels: Channel[] = []

      try {
        const result = await this.connection.rpc({ method: 'listclosedchannels' })

        closedChannels = await Promise.all(
          (result as { closedchannels: ClosedChannel[] }).closedchannels.map(
            async ({
              channel_id,
              opener,
              peer_id,
              funding_txid,
              funding_outnum,
              closer,
              close_cause,
              final_to_us_msat
            }) => {
              const peer = peer_id
                ? (
                    (await this.connection.rpc({
                      method: 'listnodes',
                      params: { id: peer_id }
                    })) as ListNodesResponse
                  ).nodes[0]
                : undefined

              return {
                id: channel_id,
                walletId: this.connection.walletId,
                opener,
                fundingTransactionId: funding_txid,
                fundingOutput: funding_outnum,
                peerId: peer_id,
                peerAlias: peer?.alias,
                peerConnected: false,
                status: 'closed',
                closer,
                closeCause: close_cause,
                finalToUs: msatsToSats(formatMsatString(final_to_us_msat)),
                balanceLocal: 0,
                balanceRemote: 0,
                reserveLocal: 0,
                reserveRemote: 0
              } as Channel
            }
          )
        )
      } catch (error) {
        log.error((error as Error).message)
      }

      if (versionNumber < 2305) {
        const listPeersResult = await this.connection.rpc({
          method: 'listpeers',
          params: channel?.peerId ? { id: channel.peerId } : undefined
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
                  maximum_htlc_out_msat,
                  our_to_self_delay,
                  their_to_self_delay,
                  state_changes
                } = channel

                return {
                  walletId: this.connection.walletId,
                  opener,
                  peerId: id,
                  peerConnected: connected,
                  peerAlias: peer?.alias,
                  fundingTransactionId: funding_txid,
                  fundingOutput: funding_outnum,
                  id: channel_id,
                  shortId: short_channel_id,
                  status: stateToChannelStatus(state_changes?.length ? state_changes : state),
                  balanceLocal: msatsToSats(formatMsatString(to_us_msat)),
                  balanceRemote: msatsToSats(
                    Big(formatMsatString(total_msat)).minus(formatMsatString(to_us_msat)).toString()
                  ),
                  reserveRemote: msatsToSats(formatMsatString(our_reserve_msat || '0')),
                  reserveLocal: msatsToSats(formatMsatString(their_reserve_msat || '0')),
                  feeBase: msatsToSats(formatMsatString(fee_base_msat.toString())),
                  feePpm: fee_proportional_millionths,
                  closeToAddress: close_to_addr ?? null,
                  closeToScriptPubkey: close_to ?? null,
                  closer,
                  htlcMin: msatsToSats(formatMsatString(minimum_htlc_out_msat)),
                  htlcMax: msatsToSats(formatMsatString(maximum_htlc_out_msat)),
                  ourToSelfDelay: our_to_self_delay,
                  theirToSelfDelay: their_to_self_delay,
                  htlcs: htlcs.map(
                    ({ direction, id, amount_msat, expiry, payment_hash, state }) => ({
                      id,
                      direction,
                      amount: msatsToSats(formatMsatString(amount_msat)),
                      expiry,
                      paymentHash: payment_hash,
                      state
                    })
                  )
                } as Channel
              })
            })
        )

        const flattened = result.concat(closedChannels).flat()

        return channel?.id ? flattened.filter(({ id }) => id === channel.id) : flattened
      } else {
        const listPeerChannelsResult = await this.connection.rpc({
          method: 'listpeerchannels',
          params: channel?.peerId ? { id: channel.peerId } : undefined
        })

        const { channels } = listPeerChannelsResult as ListPeerChannelsResponse

        const formattedChannels = await Promise.all(
          channels.map(async (chan) => {
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
              maximum_htlc_out_msat,
              our_to_self_delay,
              their_to_self_delay,
              state_changes
            } = chan

            const {
              nodes: [peer]
            } = (await this.connection.rpc({
              method: 'listnodes',
              params: { id: peer_id }
            })) as ListNodesResponse

            return {
              walletId: this.connection.walletId,
              opener,
              peerId: peer_id,
              peerConnected: peer_connected,
              peerAlias: peer?.alias,
              fundingTransactionId: funding_txid,
              fundingOutput: funding_outnum,
              id: channel_id,
              shortId: short_channel_id,
              status: stateToChannelStatus(state_changes?.length ? state_changes : state),
              balanceLocal: msatsToSats(formatMsatString(to_us_msat)),
              balanceRemote: msatsToSats(
                Big(formatMsatString(total_msat)).minus(formatMsatString(to_us_msat)).toString()
              ),
              reserveRemote: msatsToSats(formatMsatString(our_reserve_msat)),
              reserveLocal: msatsToSats(formatMsatString(their_reserve_msat)),
              feeBase: msatsToSats(formatMsatString(fee_base_msat)),
              feePpm: fee_proportional_millionths,
              closeToAddress: close_to_addr,
              closeToScriptPubkey: close_to,
              closer: closer,
              htlcMin: msatsToSats(formatMsatString(minimum_htlc_out_msat)),
              htlcMax: msatsToSats(formatMsatString(maximum_htlc_out_msat)),
              ourToSelfDelay: our_to_self_delay,
              theirToSelfDelay: their_to_self_delay,
              htlcs: htlcs.map(({ direction, id, amount_msat, expiry, payment_hash, state }) => ({
                id,
                direction,
                amount: msatsToSats(formatMsatString(amount_msat)),
                expiry,
                paymentHash: payment_hash,
                state
              }))
            } as Channel
          })
        )

        const allChannels = formattedChannels.concat(closedChannels)

        return channel?.id ? allChannels.filter(({ id }) => id === channel.id) : allChannels
      }
    } catch (error) {
      const context = 'get (channels)'

      const connectionError = handleError(error as CoreLnError, context, this.connection.walletId)

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
          feebase: feeBase && satsToMsats(feeBase),
          feeppm: feeRate,
          htlcmin: htlcMin && satsToMsats(htlcMin),
          htlcmax: htlcMax && satsToMsats(htlcMax),
          enforcedelay: enforceDelay
        }
      })
    } catch (error) {
      const context = 'update (channels)'

      const connectionError = handleError(error as CoreLnError, context, this.connection.walletId)

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

      const connectionError = handleError(error as CoreLnError, context, this.connection.walletId)

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

      const connectionError = handleError(error as CoreLnError, context, this.connection.walletId)

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }
}

export default Channels
