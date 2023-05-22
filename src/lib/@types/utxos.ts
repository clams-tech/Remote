export type OutputStatus = 'unconfirmed' | 'confirmed' | 'spent' | 'immature'

export type Utxo = {
  txid: string
  output: number
  amount_msat: string
  scriptpubkey: string
  address: string
  status: OutputStatus
  blockheight?: number
  /** the node this utxo is associated with */
  nodeId?: string
  reserved?: boolean
}
