import type { Utxo } from '$lib/@types/utxos.js'
import type { UtxosInterface } from '../interfaces.js'
import handleError from './error.js'
import { formatUtxos } from './worker.js'

import type {
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
      const funds = await this.connection.rpc({ method: 'listfunds', params: { spent: true } })
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

      const formatted = await formatUtxos(outputs, accountEvents, this.connection.walletId)

      return formatted
    } catch (error) {
      const context = 'get (utxos)'

      const connectionError = handleError(error as CoreLnError, context, this.connection.walletId)

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }
}

export default Utxos
