export type Node = {
  alias: string
  id: string
  color: string
  network: 'regtest' | 'mainnet' | 'testnet'
  version: string
  binding: NodeBinding[]
}

export type NodeBinding = {
  type: string
  address: string
  port: number
}

export type ParsedNodeAddress = {
  publicKey: string
  ip: string
  port?: number
}
