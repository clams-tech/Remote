export type Node = {
  alias: string
  id: string
  color: string
  network: 'bitcoin' | 'regtest' | 'testnet'
  version: string
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
