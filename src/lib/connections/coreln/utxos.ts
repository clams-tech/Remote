import type { Utxo } from '$lib/@types/utxos.js'
import type { UtxosInterface } from '../interfaces.js'
import handleError from './error.js'
import type {
  ChainEvent,
  CorelnConnectionInterface,
  CoreLnError,
  ListAccountEventsResponse,
  ListfundsResponse
} from './types.js'

class Utxos implements UtxosInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  async get(): Promise<Utxo[]> {
    try {
      const funds = await this.connection.rpc({ method: 'listfunds' })
      const { outputs } = funds as ListfundsResponse
      let accountEvents: ListAccountEventsResponse | null

      try {
        accountEvents = (await this.connection.rpc({
          method: 'bkpr-listaccountevents'
        })) as ListAccountEventsResponse
      } catch (error) {
        // don't have permissions to get account events, so set to null
        accountEvents = null
      }

      return outputs.map(
        ({ txid, output, amount_msat, scriptpubkey, address, status, reserved, blockHeight }) => {
          const event =
            accountEvents &&
            accountEvents.events.find((event) => {
              const { type, tag, outpoint } = event as ChainEvent
              type === 'chain' && tag === 'deposit' && outpoint === `${txid}:${output}`
            })

          return {
            txid,
            output,
            amount_msat,
            scriptpubkey,
            address,
            status,
            reserved,
            blockHeight,
            connectionId: this.connection.info.connectionId,
            timestamp: event?.timestamp || null
          }
        }
      )
    } catch (error) {
      const context = 'get (utxos)'

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

export default Utxos
