export type Connection = {
  /** <node_public_key>@<ip>:<port>*/
  address: string
  /** token (rune) used for RPC requests */
  token: string
  /** private key used for lnconnect for consistent browser node public key */
  sessionSecret: string
  /** the corresponding public key to the session secret */
  id: string
  /** the node that this auth is for */
  nodeId: string
}
