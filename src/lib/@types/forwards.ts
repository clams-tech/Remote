export type Forward = {
  /** hash of the whole forward */
  id: string
  /** the short channel id in */
  shortIdIn: string
  /** the short channel id in */
  shortIdOut: string
  htlcInId: number
  htlcOutId: number
  /** amount in */
  in: number
  /** amount out */
  out: number
  /** fee amount */
  fee: number
  status: 'settled' | 'offered' | 'failed' | 'local_failed'
  style: 'tlv' | 'legacy'
  /** unix timestamp seconds start */
  createdAt: number
  /** unix timestamp seconds complete */
  completedAt?: number
  walletId: string
}
