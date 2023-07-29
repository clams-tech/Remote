export type Transaction = {
  /** the connection this onchain tx is associated with */
  connectionId: string
  id: string
  rawtx: string
  blockheight: number | null
  txindex: number | null
  locktime: number
  version: number
  rbfEnabled: boolean
  inputs: Array<{
    txid: string
    index: number
    sequence: number
  }>
  outputs: Array<{
    index: number
    amount: string
    scriptPubKey: string
  }>
  events: TransactionEvent[]
}

export type FeeEvent = {
  type: 'fee'
  amount: string
  timestamp: number
}

export type ChainEvent = {
  /** deposit is a receive, withdrawal is a send, and external is settlement to channel partner */
  type: 'deposit' | 'withdrawal'
  amount: string
  timestamp: number
}

export type ChannelEvent = {
  type: 'channelOpen' | 'channelClose' | 'externalSettle'
  /** the amount added(open), removed(close) to offchain balance or amount settled to channel partner (externalSettle) */
  amount: string
  timestamp: number
  channel: string
}

export type TransactionEvent = ChainEvent | ChannelEvent | FeeEvent

export type SendTransactionOptions = {
  /** amount to send msats */
  amount: string
  /** the address to send to */
  address: string
  /** the fee rate in sats/vbyte */
  feeRate?: number
  /** select which utxo(s) to use for the transaction
   * format is `<txid>:<vout>`
   */
  utxos?: string[]
}
