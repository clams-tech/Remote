import type { Output } from '$lib/@types/outputs.js'
import type { ListfundsResponse, RpcCall } from './types.js'

const outputs = (rpc: RpcCall, nodeId: string) => {
  /** Get all unspent outputs */
  const get = async (): Promise<Output[]> => {
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
        nodeId
      })
    )
  }

  return {
    get
  }
}

export default outputs
