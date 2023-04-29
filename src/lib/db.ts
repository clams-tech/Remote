import Dexie, { type Table } from 'dexie'
import type { Auth, Node } from './@types/node.js'
import type { Offer } from './@types/offers.js'
import type { Payment } from './@types/payments.js'
import type { Settings } from './@types/settings.js'
import type { Error } from './@types/errors.js'

export class DB extends Dexie {
  node!: Table<Node>
  auth!: Table<Auth>
  payments!: Table<Payment>
  offers!: Table<Offer>
  settings!: Table<Settings>
  errors!: Table<Error>

  constructor() {
    super('Clams')
    this.version(1).stores({
      auth: '',
      payments: 'id, offerId, value, fee, payIndex',
      offers: 'id',
      settings: '',
      errors: '++, timestamp'
    })
  }
}

export async function getLastPaymentIndex(): Promise<Payment['payIndex'] | undefined> {
  const [payment] = await db.payments.orderBy('payIndex').reverse().limit(1).toArray()
  return payment?.payIndex
}

export const db = new DB()
