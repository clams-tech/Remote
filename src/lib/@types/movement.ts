/** a summary of any funds movement */
export type Movement = {
  /** derived balance change */
  balanceChange: number
  /** the timestamp (unix seconds) of when movement completed or started */
  timestamp: number
  /** wallet id, address or node id */
  from?: string
  /** wallet id, address or node id */
  to?: string
  category?: 'expense' | 'income' | 'transfer'
}
