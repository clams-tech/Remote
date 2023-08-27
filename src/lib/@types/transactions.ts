export type Transaction = {
  /** the wallet this onchain tx is associated with */
  walletId: string
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
    amount: number
    address: string
  }>
  timestamp: number
  channel?: { type: 'open' | 'close'; amount: number; timestamp: number; channelId: string }
  fee?: number
}

export type SendTransactionOptions = {
  /** amount to send */
  amount: number
  /** the address to send to */
  address: string
  /** the fee rate in sats/vbyte */
  feeRate?: number
  /** select which utxo(s) to use for the transaction
   * format is `<txid>:<vout>`
   */
  utxos?: string[]
}
