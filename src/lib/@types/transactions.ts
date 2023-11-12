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
