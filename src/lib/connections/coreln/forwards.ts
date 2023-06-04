import type { Forward } from '$lib/@types/forwards.js'
import { formatMsat } from '$lib/utils.js'
import type { ForwardsInterface } from '../interfaces.js'
import handleError from './error.js'
import type { CorelnConnectionInterface, CoreLnError, ListForwardsResponse } from './types.js'

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
        }) => ({
          shortIdIn: in_channel,
          shortIdOut: out_channel,
          htlcInId: in_htlc_id,
          htlcOutId: out_htlc_id,
          in: formatMsat(in_msat),
          out: formatMsat(out_msat),
          fee: formatMsat(fee_msat),
          status,
          style,
          started: received_time,
          completed: resolved_time,
          nodeId: this.connection.info.id
        })
      )
    } catch (error) {
      const context = 'get (forwards)'
      throw handleError(error as CoreLnError, context)
    }
  }
}

export default Forwards
