import type { Transaction } from '$lib/@types/transactions.js'
import type { Node } from '$lib/@types/nodes.js'
import type { ListTransactionsResponse, RpcCall } from './types.js'

const peers = (rpc: RpcCall, node: Node) => {
  const get = async (): Promise<Transaction[]> => {
    const { transactions } = (await rpc({ method: 'listtransactions' })) as ListTransactionsResponse

    return transactions.map(
      ({ hash, rawtx, blockheight, txindex, locktime, version, inputs, outputs }) => {
        const rbfEnabled = !!inputs.find(({ sequence }) => sequence < Number('0xffffffff') - 1)

        return {
          hash,
          rawtx,
          blockheight,
          txindex,
          locktime,
          version,
          rbfEnabled,
          inputs: inputs.map(({ txid, index, sequence }) => ({ txid, index, sequence })),
          outputs: outputs.map(({ index, amount_msat }) => ({ index, amount_msat })),
          nodeId: node.id
        }
      }
    )
  }

  return {
    get
  }
}

export default peers
