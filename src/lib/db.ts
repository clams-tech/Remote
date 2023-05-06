import Dexie, { type Table } from 'dexie'
import type { Node } from './@types/nodes.js'
import type { Offer } from './@types/offers.js'
import type { Payment } from './@types/payments.js'
import type { Settings } from './@types/settings.js'
import type { Error } from './@types/errors.js'
import type { Connection } from './@types/connections.js'
import type { Channel } from './@types/channels.js'
import type { Output } from './@types/outputs.js'

export class DB extends Dexie {
  channels!: Table<Channel>
  connections!: Table<Connection>
  errors!: Table<Error>
  nodes!: Table<Node>
  offers!: Table<Offer>
  outputs!: Table<Output>
  payments!: Table<Payment>
  settings!: Table<Settings>

  constructor() {
    super('Clams')
    this.version(1).stores({
      channels: 'id, nodeId, peerId',
      connections: 'id, nodeId',
      errors: '++, timestamp, nodeId',
      nodes: 'id',
      offers: 'id, nodeId',
      outputs: 'txid, nodeId',
      payments: 'id, nodeId, offerId, value, fee, payIndex',
      settings: ''
    })
  }
}

export async function getLastPaymentIndex(): Promise<Payment['payIndex'] | undefined> {
  const [payment] = await db.payments.orderBy('payIndex').reverse().limit(1).toArray()
  return payment?.payIndex
}

export async function getSettings(): Promise<Settings> {
  const [settings] = await db.settings.toArray()
  return settings
}

export async function getConnection(): Promise<Connection> {
  const [connection] = await db.connections.toArray()
  return connection
}

export async function updatePayment(update: Payment): Promise<void> {
  return db.payments.put(update)
}

export const db = new DB()
