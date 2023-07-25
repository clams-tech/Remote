export type Address = {
  /** the onchain address awaiting payment */
  id: string
  /** the connection id that created this receive address */
  connectionId: string
  /** unix timestamp this address was created */
  createdAt: number
  /** Amount msat expected */
  amount: string | 'any'
  /** description added to BIP21 QR */
  description?: string
  /** unix timestamp of confirmed tx received to this address */
  completedAt?: number
  /** the tx id of the tx sent to this address */
  txid?: string
}
