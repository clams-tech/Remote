import type { Forward } from './forwards.js'
import type { Payment } from './payments.js'

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
export type ExistsFilter = FilterBase & { type: 'exists'; applied: boolean }
export type OneOfFilter = FilterBase & {
  type: 'one-of'
  values: { label: string; value: string; applied: boolean }[]
}
export type DateRangeFilter = FilterBase & {
  type: 'date-range'
  values: { gt: Date | null; lt: Date | null }
}
export type AmountRangeFilter = FilterBase & {
  type: 'amount-range'
  values: { gt: number | null; lt: number | null }
}
export type Filter = ExistsFilter | OneOfFilter | DateRangeFilter | AmountRangeFilter

export type SortDirection = 'asc' | 'desc'
export type Sorter = { label: string; key: string; direction: SortDirection }

export type Sorters = {
  applied: { key: Sorter['key']; direction: SortDirection }
  options: Sorter[]
}

export type TagFilterOption = { id: string; label: string; applied: boolean }

export type GetDailyItemsBase = {
  offset: number
  limit: number
  sort: Sorters['applied']
  filters: Filter[]
  tags: string[]
}

export type DBGetPaymentsOptions = GetDailyItemsBase & {
  /** this is used for efficient paging and is required if using offset > 0 */
  lastPayment?: Payment
}

export type DBGetForwardsOptions = GetDailyItemsBase & {
  /** this is used for efficient paging and is required if using offset > 0 */
  lastForward?: Forward
}

export type ValueOf<Obj> = Obj[keyof Obj]

export type Notification = { id: string; heading: string; message: string; onclick?: () => void }
