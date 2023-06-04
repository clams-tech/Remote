import Dexie, { type Table } from 'dexie'
import type { Node } from './@types/nodes.js'
import type { ConnectionInfo } from './@types/connections.js'
import type { Offer } from './@types/offers.js'
import type { Invoice } from './@types/invoices.js'
import type { Channel } from './@types/channels.js'
import type { Utxo } from './@types/utxos.js'
import type { Transaction } from './@types/transactions.js'
import type { Forward } from './@types/forwards.js'

export class DB extends Dexie {
  channels!: Table<Channel>
  connections!: Table<ConnectionInfo>
  nodes!: Table<Node>
  offers!: Table<Offer>
  invoices!: Table<Invoice>
  transactions!: Table<Transaction>
  utxos!: Table<Utxo>
  forwards!: Table<Forward>

  constructor() {
    super('Clams')

    this.version(1).stores({
      channels: '&id, nodeId, shortId',
      connections: '&id, type',
      forwards: ', nodeId, shortIdIn, shortIdOut, fee, status',
      invoices: '&id, nodeId, offerId, value, fee, payIndex',
      nodes: '&id, alias, connectionId',
      offers: '&id, nodeId',
      transactions: '&hash, nodeId',
      utxos: '&txid, nodeId'
    })
  }
}

export const db = new DB()
