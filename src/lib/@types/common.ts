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

type FilterBase = { key: string; label: string }
export type ExistsFilter = FilterBase & { comparison: 'exists' }
export type IncludesFilter = FilterBase & { comparison: 'one-of'; value: string[] }
export type GreaterThanFilter = FilterBase & { comparison: 'gt'; value: number }
export type LessThanFilter = FilterBase & { comparison: 'lt'; value: number }
export type Filter = ExistsFilter | IncludesFilter | GreaterThanFilter | LessThanFilter

export type OneOfFilterOption = FilterBase & {
  type: 'one-of'
  options: { label: string; value: string }
}

export type DateRangeFilterOption = FilterBase & { type: 'date-range' }
export type AmountRangeFilterOption = FilterBase & { type: 'amount-range' }
export type ExistsFilterOption = FilterBase & { type: 'exists' }

export type FilterOption =
  | OneOfFilterOption
  | DateRangeFilterOption
  | AmountRangeFilterOption
  | ExistsFilterOption

export type SortDirection = 'asc' | 'desc'
export type Sorter = { label: string; key: string; direction: SortDirection }

export type DBGetPaymentsOptions = {
  offset: number
  limit: number
  sort: Sorter
  filters: Filter[]
}

export type ValueOf<Obj> = Obj[keyof Obj]
