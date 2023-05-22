export type Connection = CoreLnConnection | XPubConnection | MultiSigConnection

export type ConnectionType = 'lightning' | 'xpub' | 'multisig'

export type ConnectionBase = {
  /** randomly generated id */
  id: string
  type: ConnectionType
  /** user input label */
  label: string
}

export type CoreLnConnection = ConnectionBase & {
  data: {
    /** the node public key */
    publicKey: string
    version?: string
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

export type LndConnection = ConnectionBase

export type XPubConnection = ConnectionBase & {
  data: {
    xpub: string
    /** the derivation path to use to derive public keys */
    derivationPath: string
  }
}

export type MultiSigConnection = ConnectionBase & {
  data: {
    quorum: `${number}of${number}`
    xpubs: Array<XPubConnection['data']>
  }
}
