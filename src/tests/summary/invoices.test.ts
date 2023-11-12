import 'fake-indexeddb/auto'
import { expect, test } from 'vitest'
import { db } from '$lib/db/index.js'
import type { Wallet } from '$lib/@types/wallets.js'
import { deriveInvoiceSummary } from '$lib/summary.js'
import type { InvoicePayment } from '$lib/@types/payments.js'

const clearDb = () => Promise.all(db.tables.map(table => table.clear()))

const daveWallet: Wallet = {
  id: '65d27be876a0b28d635fc43d2e809ab71b6fa91bfe18d19524fcfd6b35b17fc8',
  label: 'Dave',
  type: 'coreln',
  createdAt: 1695515005,
  modifiedAt: 1695515023,
  configuration: {
    address: '0271b179dabe121a8342a8b75d67f4bb7c6ccb18a0e076763b48abb402e0c34552@localhost:7003',
    connection: { type: 'direct', value: 'ws:' },
    token: 'JcalwGeBPLB_znGiwZhtIkKm6S3Kt9SFLIVgCurz91c9MA=='
  },
  lastSync: 1695515024,
  syncing: false,
  nodeId: '0271b179dabe121a8342a8b75d67f4bb7c6ccb18a0e076763b48abb402e0c34552'
}

const erinWallet: Wallet = {
  id: 'abeab0d8cd9d606babaa3f7a7d14844f00af70c23a646487cd6ee76e24582acf',
  label: 'Erin',
  type: 'coreln',
  createdAt: 1695507927,
  modifiedAt: 1695507948,
  configuration: {
    address: '0317215a764f6e182d14d77e9a0a460b9b8b94cba37b35e091ac89be8f0510dab7@localhost:7004',
    connection: { type: 'direct', value: 'ws:' },
    token: '6GRIj_XNhMjQ4mjebtyYZcDa5j2-dxgKf86NqgmdJJY9MA=='
  },
  lastSync: 1695514204,
  syncing: false,
  nodeId: '0317215a764f6e182d14d77e9a0a460b9b8b94cba37b35e091ac89be8f0510dab7'
}

const erinReceiveInvoice: InvoicePayment = {
  id: 'd5cb00e7192e45d933e7db87497ab5c2b7307bd029caf350efa6ac66d68b21f4',
  walletId: 'abeab0d8cd9d606babaa3f7a7d14844f00af70c23a646487cd6ee76e24582acf',
  status: 'complete',
  type: 'invoice',
  network: 'regtest',
  timestamp: 1695514294,
  data: {
    request:
      'lnbcrt1pjs7l57sp5apx735tv3tw02r5czgmayxfl9klcelvurp4hnwz0n4xam2etk85qpp56h9spece9ezajvl8mwr5j744c2mnq77s9890x58056kxd45ty86qdqqxqyz5vqcqp29qxpqysgq5mynr9vxpycalr3zzyv9z8hhnxkcyfljnfk7lwzqgjcyypt5srgxs5n2zcpfkmgf86kvs5mmzcmn94fppnknat3wjuh0nz92qsfvypcqz6yc85',
    type: 'bolt11',
    direction: 'receive',
    preimage: '2aa6d4a88d279b5006445c02a8dc264d34efadb2124a00b4a80a420fa4583e20',
    amount: 21,
    completedAt: 1695514294,
    expiresAt: 1695600670,
    description: '',
    createdAt: 1695514270,
    payIndex: 1
  }
}

const daveTransferredToErinInvoice: InvoicePayment = {
  walletId: '65d27be876a0b28d635fc43d2e809ab71b6fa91bfe18d19524fcfd6b35b17fc8',
  id: 'd5cb00e7192e45d933e7db87497ab5c2b7307bd029caf350efa6ac66d68b21f4',
  status: 'complete',
  timestamp: 1695514293,
  network: 'regtest',
  type: 'invoice',
  data: {
    counterpartyNode: '0317215a764f6e182d14d77e9a0a460b9b8b94cba37b35e091ac89be8f0510dab7',
    request:
      'lnbcrt1pjs7l57sp5apx735tv3tw02r5czgmayxfl9klcelvurp4hnwz0n4xam2etk85qpp56h9spece9ezajvl8mwr5j744c2mnq77s9890x58056kxd45ty86qdqqxqyz5vqcqp29qxpqysgq5mynr9vxpycalr3zzyv9z8hhnxkcyfljnfk7lwzqgjcyypt5srgxs5n2zcpfkmgf86kvs5mmzcmn94fppnknat3wjuh0nz92qsfvypcqz6yc85',
    createdAt: 1695514293,
    direction: 'send',
    preimage: '2aa6d4a88d279b5006445c02a8dc264d34efadb2124a00b4a80a420fa4583e20',
    amount: 21,
    fee: 0,
    type: 'bolt11',
    completedAt: 1695514293
  }
}

test('Summarise a receive invoice with unknown payer', async () => {
  await clearDb()
  await db.wallets.add(erinWallet)
  await db.payments.add(erinReceiveInvoice)

  const summary = await deriveInvoiceSummary(erinReceiveInvoice)

  const { completedAt, amount, fee, request } = erinReceiveInvoice.data

  expect(summary).toStrictEqual({
    timestamp: completedAt,
    fee: fee || 0,
    category: 'income',
    type: 'receive',
    amount,
    primary: { type: 'wallet', value: erinWallet },
    secondary: { type: 'unknown', value: request }
  })
})

test('Summarise a transfer invoice between owned wallets', async () => {
  await clearDb()
  await db.wallets.bulkAdd([erinWallet, daveWallet])
  await db.payments.bulkAdd([erinReceiveInvoice, daveTransferredToErinInvoice])

  const summary = await deriveInvoiceSummary(daveTransferredToErinInvoice)

  const { completedAt, amount, fee } = daveTransferredToErinInvoice.data

  expect(summary).toStrictEqual({
    timestamp: completedAt,
    fee: fee || 0,
    category: 'neutral',
    type: 'transfer',
    amount,
    primary: { type: 'wallet', value: daveWallet },
    secondary: { type: 'wallet', value: erinWallet }
  })
})

test('Summarise a paid invoice to unknown destination', async () => {
  await clearDb()
  await db.wallets.bulkAdd([daveWallet])
  await db.payments.bulkAdd([daveTransferredToErinInvoice])

  const summary = await deriveInvoiceSummary(daveTransferredToErinInvoice)

  const { completedAt, amount, fee, counterpartyNode } = daveTransferredToErinInvoice.data

  expect(summary).toStrictEqual({
    timestamp: completedAt,
    fee: fee || 0,
    category: 'expense',
    type: 'send',
    amount,
    primary: { type: 'wallet', value: daveWallet },
    secondary: { type: 'unknown', value: counterpartyNode }
  })
})
