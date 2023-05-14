export type OutputStatus = 'unconfirmed' | 'confirmed' | 'spent' | 'immature'

export type Output = {
  txid: string
  output: number
  amount_msat: string
  scriptpubkey: string
  address: string
  status: OutputStatus
  reserved: boolean
  nodeId: string
  blockheight?: number
}
