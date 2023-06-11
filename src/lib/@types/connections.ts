export type ConnectionInfoType =
  | 'coreln'
  | 'lnd'
  | 'xpub'
  | 'multisig'
  | 'webln'
  | 'electrum'
  | 'nostr-wallet-connect'

export type ConnectionInfo = {
  /** randomly generated id */
  id: string
  type: ConnectionInfoType
  /** user input label */
  label: string
  /** data is encrypted with session secret */
  configuration: ConnectionConfiguration | null
}

export type ConnectionConfiguration =
  | CoreLnConfiguration
  | XPubConfiguration
  | MultiSigConfiguration
  | ElectrumConfiguration

export type CoreLnConfiguration = {
  /** <publicKey>@<ip>:<port> */
  address: string
  /** authentication token (rune) */
  token: string
  connection: {
    type: 'proxy' | 'direct'
    /** if proxy type, then is the proxy url
     * otherwise if direct then ws type ('wss:' or 'ws:')
     */
    value: string
  }
}

export type XPubConfiguration = {
  xpub: string
  /** the derivation path to use to derive public keys */
  derivationPath: string
}

export type MultiSigConfiguration = {
  quorum: `${number}of${number}`
  xpubs: Array<XPubConfiguration>
}

export type ElectrumConfiguration = {
  url: string
  port: number
}
