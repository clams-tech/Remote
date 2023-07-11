import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex } from '@noble/hashes/utils'
import type { Forward } from '$lib/@types/forwards.js'
import type { ForwardsInterface } from '../interfaces.js'
import handleError from './error.js'
import type { CorelnConnectionInterface, CoreLnError, ListForwardsResponse } from './types.js'
import { stripMsatSuffix } from './utils.js'

class Forwards implements ForwardsInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  async get(): Promise<Forward[]> {
    try {
      const listForwardsResponse = await this.connection.rpc({ method: 'listforwards' })
      const { forwards } = listForwardsResponse as ListForwardsResponse

      return forwards.map(
        ({
          in_channel,
          out_channel,
          in_htlc_id,
          out_htlc_id,
          in_msat,
          out_msat,
          fee_msat,
          status,
          style,
          received_time,
          resolved_time
        }) => {
          const forward = {
            shortIdIn: in_channel,
            shortIdOut: out_channel,
            htlcInId: in_htlc_id,
            htlcOutId: out_htlc_id,
            in: stripMsatSuffix(in_msat),
            out: stripMsatSuffix(out_msat),
            fee: stripMsatSuffix(fee_msat),
            status,
            style,
            started: received_time,
            completed: resolved_time,
            connectionId: this.connection.info.connectionId
          }

          const id = bytesToHex(sha256(JSON.stringify(forward)))

          return { ...forward, id }
        }
      )
    } catch (error) {
      const context = 'get (forwards)'

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

export default Forwards
