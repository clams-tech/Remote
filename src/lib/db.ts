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
