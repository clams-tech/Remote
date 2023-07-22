export type OutputStatus = 'unconfirmed' | 'confirmed' | 'spent' | 'immature'

export type Utxo = {
  txid: string
  output: number
  amount_msat: string
  scriptpubkey: string
  address: string
  status: OutputStatus
  connectionId: string
  timestamp: number | null
  blockheight?: number
  reserved?: boolean
}
