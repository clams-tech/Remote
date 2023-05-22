import type { RpcCall, SignMessageResponse } from './types.js'

const node = (rpc: RpcCall) => {
  const signMessage = async (message: string): Promise<SignMessageResponse> => {
    const result = await rpc({
      method: 'signmessage',
      params: { message }
    })

    return result as SignMessageResponse
  }

  return {
    signMessage
  }
}

export default node
