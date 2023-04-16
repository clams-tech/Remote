import Dexie, { type Table } from 'dexie'
import type { Auth } from './@types/auth.js'
import type { Offer } from './@types/offers.js'
import type { Payment } from './@types/payments.js'
import type { Settings } from './@types/settings.js'

export class DB extends Dexie {
  auth!: Table<Auth>
  payments!: Table<Payment>
  offers!: Table<Offer>
  settings!: Table<Settings>

  constructor() {
    super('Clams')
    this.version(1).stores({
      auth: '',
      payments: 'id, offerId, value, fee, payIndex',
      offers: 'id',
      settings: ''
    })
  }
}

export const db = new DB()
