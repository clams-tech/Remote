import { convertVersionNumber } from './utils.js'
import type { ChannelsInterface } from '../interfaces.js'
import handleError from './error.js'
import { satsToMsats } from '$lib/conversion.js'
import type { CoreLnError, CorelnConnectionInterface, FundChannelResponse } from './types.js'
import { getChannels } from './worker.js'

import type {
  Channel,
  CloseChannelOptions,
  CloseChannelResult,
  ConnectPeerOptions,
  OpenChannelOptions,
  OpenChannelResult,
  UpdateChannelOptions
} from '$lib/@types/channels.js'

class Channels implements ChannelsInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  public async get(channel?: { id: string; peerId: string }): Promise<Channel[]> {
    try {
      const { version } = await this.connection.info
      const versionNumber = convertVersionNumber(version as string)

      const channels = await getChannels({
        rune: this.connection.rune,
        version: versionNumber,
        walletId: this.connection.walletId,
        channel,
        socketId: this.connection.socket!.id
      })

      return channels
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

  public async close(options: CloseChannelOptions): Promise<CloseChannelResult> {
    try {
      const { id, unilateralTimeout } = options

      const result = (await this.connection.rpc({
        method: 'close',
        params: { id, unilateraltimeout: unilateralTimeout }
      })) as CloseChannelResult

      return result
    } catch (error) {
      const context = 'close (channels)'

      const connectionError = handleError(error as CoreLnError, context, this.connection.walletId)

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }
}

export default Channels
