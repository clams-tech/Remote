export type Transaction = {
  hash: string
  rawtx: string
  blockheight: number | null
  txindex: number
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
    amount_msat: string
  }>
  /** the node this onchain tx is associated with */
  nodeId?: string
}
