import type { Node } from '$lib/@types/nodes.js'
import type { NetworkInterface } from '../interfaces.js'
import handleError from './error.js'

import type {
  CorelnConnectionInterface,
  CoreLnError,
  ListNodesResponse,
  NodeFullResponse
} from './types.js'

class Network implements NetworkInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  async getNode(id: string): Promise<Node | null> {
    try {
      const result = await this.connection.rpc({
        method: 'listnodes',
        params: { id }
      })

      const {
        nodes: [node]
      } = result as ListNodesResponse

      if (!node) return null

      const { last_timestamp, alias, color } = node as NodeFullResponse
      return last_timestamp ? { id, alias, color, lastUpdated: last_timestamp } : null
    } catch (error) {
      const context = 'getNode (node)'

      const connectionError = handleError(error as CoreLnError, context, this.connection.walletId)

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }
}

export default Network
