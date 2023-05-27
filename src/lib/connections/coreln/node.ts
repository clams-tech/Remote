import type { NodeInterface } from '../interfaces.js'
import type { CorelnConnectionInterface, SignMessageResponse } from './types.js'

class Node implements NodeInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  async signMessage(message: string): Promise<string> {
    const result = await this.connection.rpc({
      method: 'signmessage',
      params: { message }
    })

    const { signature } = result as SignMessageResponse

    return signature
  }
}

export default Node
