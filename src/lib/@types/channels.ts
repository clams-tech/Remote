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
  fundingTransactionId: string | null
  /** 0-based index of the output in the funding transaction */
  fundingOutput: number | null
  /** id of node with which channel is opened */
  peerId: string
  /** alias of node with which channel is opened */
  peerAlias: string | null
  status: ChannelStatus
  /** msat */
  balanceLocal: string | null
  /** msat */
  balanceRemote: string | null
  /** msat */
  balanceTotal: string | null
  /** value spendable (msat) */
  balanceSendable: string | null
  /** value receivable (msat) */
  balanceReceivable: string | null
  /** amount we charge to use the channel (msat) */
  feeBase: string | null
  /** Fees earned on routed OUTBOUND (msat) */
  routingFees: string | null
  /** APY for fees earned on OUTBOUND routed payments */
  apy: string | null
  /** The bitcoin address we will close to */
  closeToAddress: string | null
  /** which side closed this channel */
  closer: 'local' | 'remote' | null
  /** has channel been closed and all outputs resolved? */
  resolved: boolean | null
  /** block number the channel was resolved at */
  resolvedAtBlock: number | null
  /** node id this channel is associated with */
  nodeId: string
}
