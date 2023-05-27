import type { Utxo } from '$lib/@types/utxos.js'
import type { UtxosInterface } from '../interfaces.js'
import type { CorelnConnectionInterface, ListfundsResponse } from './types.js'

class Utxos implements UtxosInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  async get(): Promise<Utxo[]> {
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
        nodeId: this.connection.info.id
      })
    )
  }
}

export default Utxos
