export type ChannelStatus = 'active' | 'opening' | 'closing' | 'closed'

export type Channel = {
  /** the wallet this channel belongs to */
  walletId: string
  /** full channel id */
  id: string
  /** short channel id */
  shortId?: string | null
  /** nodeid of who opened this channel */
  opener?: string
  /** funding transaction id */
  fundingTransactionId: string
  /** 0-based index of the output in the funding transaction */
  fundingOutput: number
  /** id of node with which channel is opened */
  peerId?: string
  /** alias of node with which channel is opened */
  peerAlias?: string
  /** currently connected to peer */
  peerConnected: boolean
  status: ChannelStatus
  balanceLocal?: number
  balanceRemote?: number
  reserveLocal?: number
  reserveRemote?: number
  /** amount we charge to use the channel */
  feeBase?: number
  /** amount we charge to use the channel in parts-per-million */
  feePpm?: number
  /** the min htlc msat size we will forward */
  htlcMin?: number | null
  /** the max htlc msat size we will forward */
  htlcMax?: number | null
  /** The bitcoin address we will close to */
  closeToAddress?: string
  htlcs?: HTLC[]
  /** which side closed this channel */
  closer?: 'local' | 'remote'
  closeCause?: 'unknown' | 'local' | 'user' | 'remote' | 'protocol' | 'onchain'
  finalToUs?: number
  ourToSelfDelay?: number
  theirToSelfDelay?: number
}

type HTLC = {
  direction: 'in' | 'out'
  id: number
  amount: number
  expiry: number
  paymentHash: string
  state: HTLCState
}

type HTLCState =
  | 'SENT_ADD_HTLC'
  | 'SENT_ADD_COMMIT'
  | 'RCVD_ADD_REVOCATION'
  | 'RCVD_ADD_ACK_COMMIT'
  | 'SENT_ADD_ACK_REVOCATION'
  | 'RCVD_REMOVE_HTLC'
  | 'RCVD_REMOVE_COMMIT'
  | 'SENT_REMOVE_REVOCATION'
  | 'SENT_REMOVE_ACK_COMMIT'
  | 'RCVD_REMOVE_ACK_REVOCATION'
  | 'RCVD_ADD_HTLC'
  | 'RCVD_ADD_COMMIT'
  | 'SENT_ADD_REVOCATION'
  | 'SENT_ADD_ACK_COMMIT'
  | 'RCVD_ADD_ACK_REVOCATION'
  | 'SENT_REMOVE_HTLC'
  | 'SENT_REMOVE_COMMIT'
  | 'RCVD_REMOVE_REVOCATION'
  | 'RCVD_REMOVE_ACK_COMMIT'
  | 'SENT_REMOVE_ACK_REVOCATION'

export type UpdateChannelOptions = {
  /** node id, channel id, short channel id */
  id: string
  feeBase?: number
  /** ppm fee rate */
  feeRate?: number
  /** the min size we will forward */
  htlcMin?: number
  /** the max size we will forward */
  htlcMax?: number
  /** the delay in seconds before enforcing new fees and htlc settings */
  enforceDelay?: number
}

export type OpenChannelOptions = {
  /** node public key to open channel to */
  id: string
  /** amount in sats for channel size */
  amount: number
  /** whether to announce the channel to the network or not */
  announce: boolean
}

export type ConnectPeerOptions = {
  /** peer public key */
  id: string
  /** host ip or dns name */
  host?: string
  /** port to connect on, defaults to 9735 if host exists */
  port?: number
}

export type OpenChannelResult = {
  /** channel id */
  id: string
  /** raw hex transaction */
  tx: string
  /** transaction id */
  txid: string
  /** transaction vout */
  txout: number
  /** minimum amount of blocks before channel is active */
  mindepth?: number
}
