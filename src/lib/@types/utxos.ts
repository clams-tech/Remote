export type OutputStatus = 'unconfirmed' | 'confirmed' | 'spent' | 'immature'

export type Utxo = {
  id: string
  txid: string
  output: number
  amount: string
  scriptpubkey: string
  address: string
  status: OutputStatus
  connectionId: string
  timestamp: number | null
  /** the txid for the transaction that spent this output */
  spendingTxid?: string
  blockheight?: number
  reserved?: boolean
  reservedToBlock?: number
}
