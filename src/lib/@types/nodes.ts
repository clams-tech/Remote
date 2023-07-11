export type Node = {
  /** the node public key */
  id: string
  host: string
  port: number
  /** the connection this node is associated with */
  connectionId: string
  alias: string
  color: string
  version: string
}
