export type ParsedInput = {
  type:
    | 'onchain'
    | 'node_publickey'
    | 'node_address'
    | 'invoice'
    | 'offer'
    | 'lnurl'
    | 'lightning_address'
    | 'unknown'
  value: string
  /** invoice for lightning param */
  lightning?: string
  amount?: number | null
  label?: string | null
  message?: string | null
}

export type ParsedNodeAddress = {
  publicKey: string
  ip: string
  port: number
}

export type Filter = {
  label: string
  values: {
    label: string
    checked: boolean
    predicate: FilterPredicate
  }[]
}

export type FilterPredicate = {
  key: string
  values: unknown[]
  compare?: 'eq' | 'gt' | 'lt' | 'exists'
}

export type TagFilter = { tag: string; checked: boolean }
export type Sorter = { label: string; key: string; direction: 'asc' | 'desc' }
