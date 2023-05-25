import type { Node } from '$lib/@types/nodes.js'
import type { Utxo } from '$lib/@types/utxos.js'
import type { ListfundsResponse, RpcCall } from './types.js'

const utxos = (rpc: RpcCall, node: Node) => {
  /** Get all unspent outputs */
  const get = async (): Promise<Utxo[]> => {
    const { outputs } = (await rpc({ method: 'listfunds' })) as ListfundsResponse

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
        nodeId: node.id
      })
    )
  }

  return {
    get
  }
}

export default utxos
