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
import { stripUndefined } from './utils.js'

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
      channels: '&id, connectionId, shortId',
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

export const updateMetadata = async (update: Metadata) => {
  console.log({ update })
  const updated = await db.metadata.update(update.id, stripUndefined(update))

  if (!updated) {
    await db.metadata.add(update)
  }
}

export const updateTransaction = async (update: Transaction) => {
  console.log({ update, stripped: stripUndefined(update) })
  const updated = await db.transactions.update(update.id, stripUndefined(update))

  if (!updated) {
    await db.transactions.add(update)
  }
}

export const updateInvoice = async (update: Invoice) => {
  const updated = await db.invoices.update(update.id, stripUndefined(update))

  if (!updated) {
    await db.invoices.add(update)
  }
}

export const updateUtxo = async (update: Utxo) => {
  const updated = await db.utxos.update(update.id, stripUndefined(update))

  if (!updated) {
    await db.utxos.add(update)
  }
}

export const updateForward = async (update: Forward) => {
  const updated = await db.forwards.update(update.id, stripUndefined(update))

  if (!updated) {
    await db.forwards.add(update)
  }
}

export const updateChannel = async (update: Channel) => {
  const updated = await db.channels.update(update.id, stripUndefined(update))

  if (!updated) {
    await db.channels.add(update)
  }
}

export const updateOffer = async (update: Offer) => {
  const updated = await db.offers.update(update.id, stripUndefined(update))

  if (!updated) {
    await db.offers.add(update)
  }
}
