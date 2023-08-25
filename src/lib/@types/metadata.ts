export type Metadata = {
  // refers to the id of the item the metadata is attached to
  id: string
  // the type of item this metadata is attached to
  type: 'invoice' | 'transaction' | 'channel' | 'address' | 'forward' | 'utxo'
  tags: string[]
  note?: string
  balanceChange?: string | null
  counterparties?: [From, To]
  contact?: string
  exchangeRate?: string
  label?: BIP329Label
}

/** either a connection id if us, or onchain address or undefined if unknown */
type From = string | undefined
type To = string | undefined

export type BIP329Label = {
  type: 'tx' | 'addr' | 'pubkey' | 'input' | 'output' | 'xpub' | 'invoice'
  ref: string
  label: string
  origin?: string
  spendable?: boolean
}
