export type Metadata = {
  /** unique id for this metadata */
  id: string
  /** the id that this metadata is associated with (payment.id, channel.id, utxo.txid) */
  dataId: string
  /** the type of metadata which defines how the value is interpreted */
  type: MetadataType
  /** value of the metadata, could be JSON string. How to interpret the value is defined by the type */
  value: string
}

export enum MetadataType {
  tag = 'tag',
  historicalExchangeRate = 'historicalExchangeRate',
  contactName = 'contactName'
}
