export type Metadata = {
  // refers to the id of the item the metadata is attached to
  id: string
  // the type of item this metadata is attached to
  type:
    | 'invoice'
    | 'transaction'
    | 'channel'
    | 'address'
    | 'forward'
    | 'utxo'
    | 'offer'
    | 'nodeId'
    | 'deposit'
    | 'withdrawal'
    | 'forward'
    | 'trade'
  tags: string[]
  note?: string
  /** id of contact associated with this data */
  contact?: string
}
