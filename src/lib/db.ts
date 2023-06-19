import Dexie, { type Table } from 'dexie'
import type { Node } from './@types/nodes.js'
import type { ConnectionDetails } from './@types/connections.js'
import type { Offer } from './@types/offers.js'
import type { Invoice } from './@types/invoices.js'
import type { Channel } from './@types/channels.js'
import type { Utxo } from './@types/utxos.js'
import type { Transaction } from './@types/transactions.js'
import type { Forward } from './@types/forwards.js'

export class DB extends Dexie {
  channels!: Table<Channel>
  connections!: Table<ConnectionDetails>
  nodes!: Table<Node>
  offers!: Table<Offer>
  invoices!: Table<Invoice>
  transactions!: Table<Transaction>
  utxos!: Table<Utxo>
  forwards!: Table<Forward>

  constructor() {
    super('Clams')

    this.version(1).stores({
      channels: '&id, connectionId, shortId',
      connections: '&id, type',
      forwards: '&id, connectionId, shortIdIn, shortIdOut, fee, status',
      invoices: '&id, connectionId, offerId, value, fee, payIndex',
      nodes: '&id, alias, connectionId',
      offers: '&id, connectionId',
      transactions: '&hash, connectionId',
      utxos: '&txid, connectionId'
    })
  }
}

export const db = new DB()
