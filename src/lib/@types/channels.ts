export type ChannelStatus =
  | 'OPENINGD'
  | 'CHANNELD_AWAITING_LOCKIN'
  | 'CHANNELD_NORMAL'
  | 'CHANNELD_SHUTTING_DOWN'
  | 'CLOSINGD_SIGEXCHANGE'
  | 'CLOSINGD_COMPLETE'
  | 'AWAITING_UNILATERAL'
  | 'FUNDING_SPEND_SEEN'
  | 'ONCHAIN'
  | 'DUALOPEND_OPEN_INIT'
  | 'DUALOPEND_AWAITING_LOCKIN'

export type Channel = {
  /** full channel id */
  id: string | null
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
  peerAlias: string
  status: ChannelStatus
  /** msat */
  balanceLocal: string
  /** msat */
  balanceRemote: string
  /** msat */
  balanceTotal: string
  /** value spendable (msat) */
  balanceSendable: string
  /** value receivable (msat) */
  balanceReceivable: string
  /** amount we charge to use the channel (msat) */
  feeBase: string
  /** amount we charge to use the channel in parts-per-million */
  feePpm: number
  /** The bitcoin address we will close to */
  closeToAddress: string | null
  /** The bitcoin address we will close to */
  closeToScriptPubkey: string | null
  /** which side closed this channel */
  closer?: 'local' | 'remote'
}
