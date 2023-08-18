import Dexie, { type Table } from 'dexie'
import type { ConnectionDetails } from './@types/connections.js'
import type { Offer } from './@types/offers.js'
import type { Invoice } from './@types/invoices.js'
import type { Channel } from './@types/channels.js'
import type { Utxo } from './@types/utxos.js'
import type { Transaction } from './@types/transactions.js'
import type { Forward } from './@types/forwards.js'
import type { Metadata } from './@types/metadata.js'
import type { Address } from './@types/addresses.js'

class DB extends Dexie {
  connections!: Table<ConnectionDetails>
  channels!: Table<Channel>
  utxos!: Table<Utxo>
  invoices!: Table<Invoice>
  addresses!: Table<Address>
  transactions!: Table<Transaction>
  forwards!: Table<Forward>
  offers!: Table<Offer>
  metadata!: Table<Metadata>

  constructor() {
    super('Clams')

    this.version(1).stores({
      connections: '&id, type',
      channels: '&[id+connectionId], shortId',
      utxos: '&id, connectionId, txid, timestamp, spendingTxid',
      invoices:
        '&id, connectionId, hash, offerId, value, fee, payIndex, createdAt, completedAt, direction, preimage',
      addresses: '&id, connectionId, value, txid',
      transactions: '&id, connectionId, timestamp, direction',
      forwards: '&id, connectionId, shortIdIn, shortIdOut, fee, status, startedAt, completedAt',
      offers: '&id, connectionId, description, type, issuer',
      metadata: '&id, dataId, type, value'
    })
  }
}

export const db = new DB()
