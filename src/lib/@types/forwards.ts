export type Forward = {
  /** hash of the whole forward */
  id: string
  /** the short channel id in */
  shortIdIn: string
  /** the short channel id in */
  shortIdOut: string
  htlcInId: number
  htlcOutId: number
  /** amount msat in */
  in: string | number
  /** amount msat out */
  out: string | number
  /** fee amount msat */
  fee: string | number
  status: 'settled' | 'offered' | 'failed' | 'local_failed'
  style: 'tlv' | 'legacy'
  /** unix timestamp seconds start */
  started: number
  /** unix timestamp seconds complete */
  completed?: number
  connectionId: string
}
