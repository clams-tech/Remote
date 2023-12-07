import type { walletTypes } from '$lib/wallets/index.js'
import type { Metadata } from './metadata.js'

export type WalletType = (typeof walletTypes)[number]

export type Wallet = {
  /** randomly generated id */
  id: string
  type: WalletType
  /** user input label */
  label: string
  /** Unix timestamp seconds this Wallet was created */
  createdAt: number | null
  /** Unix timestamp seconds this Wallet was last modified */
  modifiedAt: number | null
  lastSync: number | null
  syncing: boolean
  /** data is encrypted with session secret */
  configuration: WalletConfiguration | null
  nodeId?: string
  metadata?: Metadata
}

export type WalletConfiguration = CoreLnConfiguration

export type CoreLnConfiguration = {
  /** <publicKey>@<ip>:<port> */
  address: string
  /** authentication token (rune) */
  token: string
  connection: {
    type: 'proxy' | 'direct'
    /** if proxy type, then is the proxy url
     * otherwise if direct then ws type ('wss:' or 'ws:')
     */
    value: string
  }
}

export type AutoConnectWalletOptions = {
  label: Wallet['label']
  type: Wallet['type']
  configuration: Wallet['configuration']
}
