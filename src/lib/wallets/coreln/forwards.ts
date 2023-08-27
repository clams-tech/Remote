import type { Forward } from '$lib/@types/forwards.js'
import type { ForwardsInterface } from '../interfaces.js'
import handleError from './error.js'
import type { CorelnConnectionInterface, CoreLnError, ListForwardsResponse } from './types.js'
import { formatMsatString } from './utils.js'
import { hash } from '$lib/crypto.js'
import { msatsToSats } from '$lib/conversion.js'

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
            in: msatsToSats(formatMsatString(in_msat)),
            out: msatsToSats(formatMsatString(out_msat)),
            fee: msatsToSats(formatMsatString(fee_msat)),
            status,
            style,
            createdAt: received_time,
            completedAt: resolved_time,
            walletId: this.connection.walletId
          }

          const id = hash(JSON.stringify(forward))

          return { ...forward, id }
        }
      )
    } catch (error) {
      const context = 'get (forwards)'

      const connectionError = handleError(error as CoreLnError, context, this.connection.walletId)

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }
}

export default Forwards
