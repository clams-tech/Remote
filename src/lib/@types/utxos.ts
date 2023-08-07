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
  blockheight?: number
  reserved?: boolean
}
