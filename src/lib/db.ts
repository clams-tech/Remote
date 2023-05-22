import Dexie, { type Table } from 'dexie'
import type { Node } from './@types/nodes.js'
import type { Connection } from './@types/connections.js'
import type { Offer } from './@types/offers.js'
import type { Payment } from './@types/payments.js'
import type { Channel } from './@types/channels.js'
import type { Utxo } from './@types/utxos.js'
import type { Transaction } from './@types/transactions.js'

export class DB extends Dexie {
  channels!: Table<Channel>
  connections!: Table<Connection>
  nodes!: Table<Node>
  offers!: Table<Offer>
  payments!: Table<Payment>
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

export async function getLastPaymentIndex(): Promise<Payment['payIndex'] | undefined> {
  const [payment] = await db.payments.orderBy('payIndex').reverse().limit(1).toArray()
  return payment?.payIndex
}

export async function updatePayment(update: Payment): Promise<void> {
  return db.payments.put(update)
}

export const db = new DB()
