import Dexie, { type Table } from 'dexie'
import type { Wallet } from '../@types/wallets.js'
import type { Offer } from '../@types/offers.js'
import type { Channel } from '../@types/channels.js'
import type { Utxo } from '../@types/utxos.js'
import type { Forward } from '../@types/forwards.js'
import type { Contact } from '../@types/contacts.js'
import type { Label } from '../@types/labels.js'
import type { Trade } from '../@types/trades.js'
import type { Withdrawal } from '../@types/withdrawals.js'
import type { Deposit } from '../@types/deposits.js'
import type { ExchangeRate } from '../@types/exchange-rates.js'
import type { Node } from '../@types/nodes.js'
import type { Payment } from '$lib/@types/payments.js'
import type { Tag } from '$lib/@types/metadata.js'

class DB extends Dexie {
  channels!: Table<Channel>
  contacts!: Table<Contact>
  deposits!: Table<Deposit>
  exchangeRates!: Table<ExchangeRate>
  forwards!: Table<Forward>
  labels!: Table<Label>
  nodes!: Table<Node>
  offers!: Table<Offer>
  payments!: Table<Payment>
  tags!: Table<Tag>
  trades!: Table<Trade>
  utxos!: Table<Utxo>
  wallets!: Table<Wallet>
  withdrawals!: Table<Withdrawal>

  constructor() {
    super('Clams')

    this.version(1).stores({
      channels:
        '&[id+walletId], id, walletId, shortId, balanceLocal, balanceRemote, peerId, status, opener, [id+opener], [fundingTransactionId+fundingOutput], [fundingTransactionId+fundingOutput+walletId], closeTo, *metadata.tags, metadata.contact',
      contacts: '&id, name, npub',
      deposits: '&id, walletId, destination, timestamp, amount, *metadata.tags, metadata.contact',
      exchangeRates: '&[timestamp+currency], price, currency',
      forwards:
        '&id, walletId, timestamp, shortIdIn, shortIdOut, fee, status, createdAt, completedAt, *metadata.tags, metadata.contact',
      labels: '&ref, type, label, spendable, origin',
      nodes: '&id, alias',
      offers:
        '&id, walletId, bolt12, amount, nodeId, description, type, issuer, [description+type+issuer], *metadata.tags, metadata.contact',
      payments:
        '&[id+walletId], timestamp, status, direction, data.channel.type, [data.channel.id+walletId], data.offer.id, network, [walletId+type], data.payIndex, *metadata.tags, metadata.contact, data.fallbackAddress, data.amount, data.fee, [type+status], [direction+data.amount], [data.direction+data.amount]',
      tags: '&id, label',
      trades:
        '&id, walletId, side, fee, amount, price, timestamp, fiatDenomination, *metadata.tags, metadata.contact',
      utxos: '&id, walletId, txid, timestamp, spendingTxid, *metadata.tags, metadata.contact',
      wallets: '&id, type, label, nodeId, *metadata.tags, metadata.contact, createdAt',
      withdrawals:
        '&id, walletId, destination, timestamp, amount, fee, *metadata.tags, metadata.contact'
    })
  }
}

export const db = new DB()

export const deleteAll = () => db.delete()
