import Dexie, { type Table } from 'dexie'
import type { Node } from './@types/nodes.js'
import type { ConnectionInfo } from './@types/connections.js'
import type { Offer } from './@types/offers.js'
import type { Invoice } from './@types/invoices.js'
import type { Channel } from './@types/channels.js'
import type { Utxo } from './@types/utxos.js'
import type { Transaction } from './@types/transactions.js'

export class DB extends Dexie {
  channels!: Table<Channel>
  connections!: Table<ConnectionInfo>
  nodes!: Table<Node>
  offers!: Table<Offer>
  payments!: Table<Invoice>
  transactions!: Table<Transaction>
  utxos!: Table<Utxo>

  constructor() {
    super('Clams')
    this.version(1).stores({
      channels: 'id, nodeId',
      connections: 'id, type',
      nodes: 'id, alias, connectionId',
      offers: 'id, nodeId',
      payments: 'id, nodeId, offerId, value, fee, payIndex',
      transactions: 'hash, nodeId',
      utxos: 'txid, nodeId'
    })
  }
}

export async function getLastPaymentIndex(): Promise<Invoice['payIndex'] | undefined> {
  const [payment] = await db.payments.orderBy('payIndex').reverse().limit(1).toArray()
  return payment?.payIndex
}

export async function updatePayment(update: Invoice): Promise<void> {
  return db.payments.put(update)
}

export const db = new DB()
