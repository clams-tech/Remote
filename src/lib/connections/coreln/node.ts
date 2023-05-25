import type { ConnectionInterface, NodeInterface } from '../interfaces.js'
import type { SignMessageResponse } from './types.js'

class Node implements NodeInterface {
  connection: ConnectionInterface

  constructor(connection: ConnectionInterface) {
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
