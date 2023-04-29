export type Node = {
  alias: string
  id: string
}

export type Auth = {
  /** <node_public_key>@<ip>:<port>*/
  address: string
  /** token used for RPC requests */
  token: string
  /** private key used for lnconnect for consistent browser node public key */
  sessionSecret: string
}

export type ParsedNodeAddress = {
  publicKey: string
  ip: string
  port?: number
}
