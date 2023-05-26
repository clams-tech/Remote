export type ConnectionInfo =
  | CoreLnConnectionInfo
  | LndConnectionInfo
  | XPubConnectionInfo
  | MultiSigConnectionInfo

export type ConnectionInfoType = 'coreln' | 'lnd' | 'xpub' | 'multisig' | 'webln' | 'lnbits'

export type ConnectionInfoBase = {
  /** randomly generated id */
  id: string
  type: ConnectionInfoType
  /** user input label */
  label: string
}

export type CoreLnConnectionInfo = ConnectionInfoBase & {
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
  data: {
    xpub: string
    /** the derivation path to use to derive public keys */
    derivationPath: string
  }
}

export type MultiSigConnectionInfo = ConnectionInfoBase & {
  data: {
    quorum: `${number}of${number}`
    xpubs: Array<XPubConnectionInfo['data']>
  }
}
