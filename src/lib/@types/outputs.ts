export type OutputStatus = 'unconfirmed' | 'confirmed' | 'spent' | 'immature'

export type Output = {
  txid: string
  output: number
  amount_msat: string
  scriptpubkey: string
  address: string
  status: 'confirmed'
  blockheight: number
  reserved: boolean
  nodeId: string
}
