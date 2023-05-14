import type { Node } from '$lib/@types/nodes.js'
import type { GetinfoResponse, RpcCall, SignMessageResponse } from './types.js'

const node = (rpc: RpcCall) => {
  const get = async (): Promise<Node> => {
    const result = await rpc({ method: 'getinfo' })
    const { alias, id, version, color, network } = result as GetinfoResponse
    return { alias, id, version, color, network }
  }

  const signMessage = async (message: string): Promise<SignMessageResponse> => {
    const result = await rpc({
      method: 'signmessage',
      params: { message }
    })

    return result as SignMessageResponse
  }

  return {
    get,
    signMessage
  }
}

export default node
