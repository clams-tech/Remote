import Dexie, { type Table } from 'dexie'
import type { Node } from './@types/connections.js'
import type { Offer } from './@types/offers.js'
import type { Payment } from './@types/payments.js'
import type { Channel } from './@types/channels.js'
import type { Output } from './@types/outputs.js'
import type { Peer } from './@types/peers.js'

export class DB extends Dexie {
  channels!: Table<Channel>
  nodes!: Table<Node>
  offers!: Table<Offer>
  outputs!: Table<Output>
  payments!: Table<Payment>
  peers!: Table<Peer>

  constructor() {
    super('Clams')
    this.version(1).stores({
      channels: 'id, nodeId, peerId',
      nodes: 'id, alias',
      offers: 'id, nodeId',
      outputs: 'txid, nodeId',
      payments: 'id, nodeId, offerId, value, fee, payIndex',
      peers: 'id, alias, nodeId'
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
