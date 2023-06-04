export type ConnectionInfo =
  | CoreLnConnectionInfo
  | LndConnectionInfo
  | XPubConnectionInfo
  | MultiSigConnectionInfo

export type ConnectionInfoType =
  | 'coreln'
  | 'lnd'
  | 'xpub'
  | 'multisig'
  | 'webln'
  | 'electrum'
  | 'nostr-wallet-connect'

export type ConnectionInfoBase = {
  /** randomly generated id */
  id: string
  type: ConnectionInfoType
  /** user input label */
  label: string
}

export type CoreLnConnectionInfo = ConnectionInfoBase & {
  /** data is encrypted with session secret */
  data: {
    /** the node public key */
    publicKey: string
    ip: string
    port: number
    connection: {
      type: 'proxy' | 'direct'
      /** if proxy type, then is the proxy url
       * otherwise if direct then ws type ('wss:' or 'ws:')
       */
      value: string
    }
    /** authentication token (rune) */
    token: string
  }
}

export type LndConnectionInfo = ConnectionInfoBase

export type XPubConnectionInfo = ConnectionInfoBase & {
  /** data is encrypted with session secret */
  data: {
    xpub: string
    /** the derivation path to use to derive public keys */
    derivationPath: string
  }
}

export type MultiSigConnectionInfo = ConnectionInfoBase & {
  /** data is encrypted with session secret */
  data: {
    quorum: `${number}of${number}`
    xpubs: Array<XPubConnectionInfo['data']>
  }
}

export type ElectrumConnectionInfo = ConnectionInfoBase & {
  data: {
    url: string
    port: number
  }
}
