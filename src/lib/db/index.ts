import Dexie, { type Table } from 'dexie'
import type { Wallet } from '../@types/wallets.js'
import type { Offer } from '../@types/offers.js'
import type { Channel } from '../@types/channels.js'
import type { Utxo } from '../@types/utxos.js'
import type { Forward } from '../@types/forwards.js'
import type { Metadata } from '../@types/metadata.js'
import type { Contact } from '../@types/contacts.js'
import type { Label } from '../@types/labels.js'
import type { Trade } from '../@types/trades.js'
import type { Withdrawal } from '../@types/withdrawals.js'
import type { Deposit } from '../@types/deposits.js'
import type { ExchangeRate } from '../@types/exchange-rates.js'
import type { Node } from '../@types/nodes.js'
import type { Payment } from '$lib/@types/payments.js'

class DB extends Dexie {
  channels!: Table<Channel>
  contacts!: Table<Contact>
  deposits!: Table<Deposit>
  exchangeRates!: Table<ExchangeRate>
  forwards!: Table<Forward>
  labels!: Table<Label>
  metadata!: Table<Metadata>
  nodes!: Table<Node>
  offers!: Table<Offer>
  payments!: Table<Payment>
  trades!: Table<Trade>
  utxos!: Table<Utxo>
  wallets!: Table<Wallet>
  withdrawals!: Table<Withdrawal>

  constructor() {
    super('Clams')

    this.version(1).stores({
      channels:
        '&[id+walletId], id, walletId, shortId, balanceLocal, balanceRemote, peerId, status, opener, [id+opener], [fundingTransactionId+fundingOutput], [fundingTransactionId+fundingOutput+walletId], closeTo',
      contacts: '&id, name, npub',
      deposits: '&id, walletId, destination, timestamp, amount',
      exchangeRates: '&[timestamp+currency], price, currency',
      forwards:
        '&id, walletId, timestamp, shortIdIn, shortIdOut, fee, status, createdAt, completedAt',
      labels: '&ref, type, label, spendable, origin',
      metadata: '&id, type, tags, contact',
      nodes: '&id, alias',
      offers:
        '&id, walletId, bolt12, amount, nodeId, description, type, issuer, [description+type+issuer]',
      payments:
        '&[id+walletId], timestamp, status, direction, data.channel.type, [data.channel.id+walletId], data.offer.id, network',
      trades: '&id, walletId, side, fee, amount, price, timestamp, fiatDenomination',
      utxos: '&id, walletId, txid, timestamp, spendingTxid',
      wallets: '&id, type, label, nodeId',
      withdrawals: '&id, walletId, destination, timestamp, amount, fee'
    })
  }
}

export const db = new DB()
