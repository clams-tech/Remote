export type Address = {
  /** the id this address is associated with */
  id: string
  /** the onchain address */
  value: string
  /** the connection id that created this receive address */
  connectionId: string
  /** unix timestamp this address was created */
  createdAt: number
  /** Amount msat expected */
  amount: string | 'any'
  /** label added to BIP21 QR */
  label?: string
  /** message added to BIP21 QR */
  message?: string
  /** unix timestamp of confirmed tx received to this address */
  completedAt?: number
  /** the tx id of the tx sent to this address */
  txid?: string
}
