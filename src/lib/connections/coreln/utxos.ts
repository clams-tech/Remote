import type { Utxo } from '$lib/@types/utxos.js'
import type { UtxosInterface } from '../interfaces.js'
import handleError from './error.js'
import type { CorelnConnectionInterface, CoreLnError, ListfundsResponse } from './types.js'

class Utxos implements UtxosInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  async get(): Promise<Utxo[]> {
    try {
      const funds = await this.connection.rpc({ method: 'listfunds' })
      const { outputs } = funds as ListfundsResponse

      return outputs.map(
        ({ txid, output, amount_msat, scriptpubkey, address, status, reserved, blockHeight }) => ({
          txid,
          output,
          amount_msat,
          scriptpubkey,
          address,
          status,
          reserved,
          blockHeight,
          connectionId: this.connection.info.connectionId
        })
      )
    } catch (error) {
      const context = 'get (utxos)'
      throw handleError(error as CoreLnError, context)
    }
  }
}

export default Utxos
