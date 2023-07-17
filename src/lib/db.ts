import Dexie, { type Table } from 'dexie'
import type { ConnectionDetails } from './@types/connections.js'
import type { Offer } from './@types/offers.js'
import type { Invoice } from './@types/invoices.js'
import type { Channel } from './@types/channels.js'
import type { Utxo } from './@types/utxos.js'
import type { Transaction } from './@types/transactions.js'
import type { Forward } from './@types/forwards.js'
import type { Metadata } from './@types/metadata.js'

class DB extends Dexie {
  channels!: Table<Channel>
  connections!: Table<ConnectionDetails>
  offers!: Table<Offer>
  invoices!: Table<Invoice>
  transactions!: Table<Transaction>
  utxos!: Table<Utxo>
  forwards!: Table<Forward>
  metadata!: Table<Metadata>

  constructor() {
    super('Clams')

    this.version(1).stores({
      channels: '&id, connectionId, shortId',
      connections: '&id, type',
      forwards: '&id, connectionId, shortIdIn, shortIdOut, fee, status',
      invoices: '&id, connectionId, offerId, value, fee, payIndex',
      offers: '&id, connectionId',
      transactions: '&hash, connectionId',
      utxos: '&txid, connectionId',
      metadata: '&id, dataId, type, value'
    })
  }
}

export const db = new DB()
