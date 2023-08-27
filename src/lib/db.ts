import Dexie, { type Table } from 'dexie'
import type { Wallet } from './@types/wallets.js'
import type { Offer } from './@types/offers.js'
import type { Invoice } from './@types/invoices.js'
import type { Channel } from './@types/channels.js'
import type { Utxo } from './@types/utxos.js'
import type { Transaction } from './@types/transactions.js'
import type { Forward } from './@types/forwards.js'
import type { Metadata } from './@types/metadata.js'
import type { Address } from './@types/addresses.js'
import { stripUndefined } from './utils.js'
import type { Contact } from './@types/contacts.js'
import type { Label } from './@types/labels.js'
import type { Trade } from './@types/trades.js'
import type { Withdrawal } from './@types/withdrawals.js'
import type { Deposit } from './@types/deposits.js'

class DB extends Dexie {
  addresses!: Table<Address>
  channels!: Table<Channel>
  contacts!: Table<Contact>
  deposits!: Table<Deposit>
  forwards!: Table<Forward>
  invoices!: Table<Invoice>
  labels!: Table<Label>
  metadata!: Table<Metadata>
  offers!: Table<Offer>
  trades!: Table<Trade>
  transactions!: Table<Transaction>
  utxos!: Table<Utxo>
  wallets!: Table<Wallet>
  withdrawals!: Table<Withdrawal>

  constructor() {
    super('Clams')

    this.version(1).stores({
      addresses: '&id, walletId, value, txid',
      channels: '&id, walletId, shortId, peerId, status',
      contacts: '&id, name, npub',
      deposits: '&id, walletId, destination, timestamp, amount',
      forwards: '&id, walletId, shortIdIn, shortIdOut, fee, status, createdAt, completedAt',
      invoices:
        '&id, walletId, hash, offerId, value, fee, payIndex, createdAt, completedAt, direction, preimage',
      labels: '&ref, type, label, spendable, origin',
      metadata: '&id, type, tags, contact',
      offers: '&id, walletId, bolt12, amount, nodeId, description, type, issuer',
      trades: '&id, walletId, side, fee, amount, price, timestamp, fiatDenomination',
      transactions: '&id, walletId, timestamp, direction',
      utxos: '&id, walletId, txid, timestamp, spendingTxid',
      wallets: '&id, type',
      withdrawals: '&id, walletId, destination, timestamp, amount, fee'
    })
  }
}

export const db = new DB()

export const updateMetadata = async (update: Metadata) => {
  const updated = await db.metadata.update(update.id, stripUndefined(update))

  if (!updated) {
    await db.metadata.add(update)
  }
}

export const updateTransaction = async (update: Transaction) => {
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
