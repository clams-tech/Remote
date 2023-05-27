import type { NodeInterface } from '../interfaces.js'
import handleError from './error.js'
import type { CorelnConnectionInterface, CoreLnError, SignMessageResponse } from './types.js'

class Node implements NodeInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  async signMessage(message: string): Promise<string> {
    try {
      const result = await this.connection.rpc({
        method: 'signmessage',
        params: { message }
      })

      const { signature } = result as SignMessageResponse

      return signature
    } catch (error) {
      const context = 'signMessage (node)'
      throw handleError(error as CoreLnError, context)
    }
  }
}

export default Node
