export type ChannelStatus =
  | 'OPENING'
  | 'CHANNEL_AWAITING_LOCKIN'
  | 'CHANNEL_NORMAL'
  | 'CHANNEL_SHUTTING_DOWN'
  | 'CLOSING_SIGEXCHANGE'
  | 'CLOSING_COMPLETE'
  | 'AWAITING_UNILATERAL'
  | 'FUNDING_SPEND_SEEN'
  | 'ONCHAIN'
  | 'DUALOPEN_OPEN_INIT'
  | 'DUALOPEN_AWAITING_LOCKIN'

export type Channel = {
  /** the connection this channel belongs to */
  connectionId: string
  /** full channel id */
  id: string
  /** short channel id */
  shortId: string | null
  /** which side opened this channel */
  opener: 'local' | 'remote'
  /** funding transaction id */
  fundingTransactionId: string
  /** 0-based index of the output in the funding transaction */
  fundingOutput: number
  /** id of node with which channel is opened */
  peerId: string
  /** alias of node with which channel is opened */
  peerAlias?: string
  /** currently connected to peer */
  peerConnected: boolean
  status: ChannelStatus
  /** msat */
  balanceLocal: string
  /** msat */
  balanceRemote: string
  /** msat */
  reserveLocal: string
  /** msat */
  reserveRemote: string
  /** amount we charge to use the channel (msat) */
  feeBase: string | null
  /** amount we charge to use the channel in parts-per-million */
  feePpm: number
  /** the min htlc msat size we will forward */
  htlcMin: string | null
  /** the max htlc msat size we will forward */
  htlcMax: string | null
  /** The bitcoin address we will close to */
  closeToAddress: string | null
  /** The bitcoin address we will close to */
  closeToScriptPubkey: string | null
  htlcs: HTLC[]
  /** which side closed this channel */
  closer?: 'local' | 'remote'
}

type HTLC = {
  direction: 'in' | 'out'
  id: number
  /** msat */
  amount: string
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
  /** msat base fee */
  feeBase?: string
  /** ppm fee rate */
  feeRate?: number
  /** the min size we will forward msat */
  htlcMin?: string
  /** the max size we will forward msat */
  htlcMax?: string
  /** the delay in seconds before enforcing new fees and htlc settings */
  enforceDelay?: number
}

export type OpenChannelOptions = {
  /** node public key to open channel to */
  id: string
  /** amount in sats for channel size */
  amount: string
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
