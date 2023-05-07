export type Auth = {
  /** <node_public_key>@<ip>:<port>*/
  address: string
  /** token (rune) used for RPC requests */
  token: string
  /** private key used for lnconnect for consistent browser node public key */
  sessionSecret: string
}
