import type { Node } from '$lib/@types/nodes.js'
import type { Peer } from '$lib/@types/peers.js'
import type { ListNodesResponse, ListPeersResponse, RpcCall } from './types.js'

const peers = (rpc: RpcCall, node: Node) => {
  const get = async (): Promise<Peer[]> => {
    const { peers } = (await rpc({ method: 'listpeers' })) as ListPeersResponse

    return Promise.all(
      peers.map(async ({ id, connected }) => {
        const { nodes } = (await rpc({ method: 'listnodes', params: [id] })) as ListNodesResponse
        const [{ alias, color }] = nodes

        return {
          id,
          alias,
          color,
          connected
        }
      })
    )
  }

  return {
    get
  }
}

export default peers
