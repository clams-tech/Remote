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

export type EqualsFilter = { comparison: 'equals'; value: string }
export type IncludesFilter = { comparison: 'includes'; value: string[] }
export type GtFilter = { comparison: 'gt'; value: number }
export type LtFilter = { comparison: 'lt'; value: number }
export type Filter = EqualsFilter | IncludesFilter | GtFilter | LtFilter
export type AppliedFilters = Record<string, Filter>
export type SortDirection = 'asc' | 'desc'

export type DBGetPaymentsOptions = {
  offset?: number
  limit?: number
  sortBy?: string
  sortDirection?: SortDirection
  filters?: AppliedFilters
}

export type ValueOf<Obj> = Obj[keyof Obj]
