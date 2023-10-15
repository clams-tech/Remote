export type OutputStatus = 'unconfirmed' | 'confirmed' | 'spent' | 'spent_unconfirmed' | 'immature'

export type Utxo = {
  id: string
  txid: string
  output: number
  amount: number
  scriptpubkey: string
  address: string
  status: OutputStatus
  walletId: string
  timestamp: number | null
  spendingTxid?: string
  blockHeight?: number
}
