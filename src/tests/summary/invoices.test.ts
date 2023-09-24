import 'fake-indexeddb/auto'
import { expect, test } from 'vitest'
import { db } from '$lib/db.js'
import type { Wallet } from '$lib/@types/wallets.js'
import type { Invoice } from '$lib/@types/invoices.js'
import { deriveInvoiceSummary } from '$lib/summary.js'
import type { Offer } from '$lib/@types/offers.js'

const clearDb = () => Promise.all(db.tables.map((table) => table.clear()))

const daveWallet = {
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
} as Wallet

const erinWallet = {
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
} as Wallet

const erinReceiveInvoice = {
  id: '77b27c756c7f80f5e63e95bc19740f64d25951928416a8af3ae8e89b0d876e4f',
  request:
    'lnbcrt1pjs7l57sp5apx735tv3tw02r5czgmayxfl9klcelvurp4hnwz0n4xam2etk85qpp56h9spece9ezajvl8mwr5j744c2mnq77s9890x58056kxd45ty86qdqqxqyz5vqcqp29qxpqysgq5mynr9vxpycalr3zzyv9z8hhnxkcyfljnfk7lwzqgjcyypt5srgxs5n2zcpfkmgf86kvs5mmzcmn94fppnknat3wjuh0nz92qsfvypcqz6yc85',
  hash: 'd5cb00e7192e45d933e7db87497ab5c2b7307bd029caf350efa6ac66d68b21f4',
  direction: 'receive',
  type: 'bolt11',
  preimage: '2aa6d4a88d279b5006445c02a8dc264d34efadb2124a00b4a80a420fa4583e20',
  amount: 21,
  status: 'complete',
  completedAt: 1695514294,
  expiresAt: 1695600670,
  description: '',
  createdAt: 1695514270,
  payIndex: 1,
  walletId: 'abeab0d8cd9d606babaa3f7a7d14844f00af70c23a646487cd6ee76e24582acf'
} as Invoice

const daveTransferredToErinInvoice = {
  id: 'f2b3d76dd6fbf5551cb90a9344041d2a74c1024646a41e3170a39363c5070fb0',
  nodeId: '0317215a764f6e182d14d77e9a0a460b9b8b94cba37b35e091ac89be8f0510dab7',
  request:
    'lnbcrt1pjs7l57sp5apx735tv3tw02r5czgmayxfl9klcelvurp4hnwz0n4xam2etk85qpp56h9spece9ezajvl8mwr5j744c2mnq77s9890x58056kxd45ty86qdqqxqyz5vqcqp29qxpqysgq5mynr9vxpycalr3zzyv9z8hhnxkcyfljnfk7lwzqgjcyypt5srgxs5n2zcpfkmgf86kvs5mmzcmn94fppnknat3wjuh0nz92qsfvypcqz6yc85',
  status: 'complete',
  createdAt: 1695514293,
  hash: 'd5cb00e7192e45d933e7db87497ab5c2b7307bd029caf350efa6ac66d68b21f4',
  preimage: '2aa6d4a88d279b5006445c02a8dc264d34efadb2124a00b4a80a420fa4583e20',
  amount: 21,
  fee: 0,
  direction: 'send',
  type: 'bolt11',
  completedAt: 1695514293,
  walletId: '65d27be876a0b28d635fc43d2e809ab71b6fa91bfe18d19524fcfd6b35b17fc8'
} as Invoice

test('Summarise a receive invoice with unknown payer', async () => {
  await clearDb()
  await db.wallets.add(erinWallet)
  await db.invoices.add(erinReceiveInvoice)

  const summary = await deriveInvoiceSummary(erinReceiveInvoice)

  const { completedAt, amount, fee } = erinReceiveInvoice

  expect(summary).toStrictEqual({
    timestamp: completedAt,
    fee: fee || 0,
    category: 'income',
    type: 'receive',
    amount,
    primary: { type: 'wallet', value: erinWallet },
    secondary: { type: 'unknown', value: erinReceiveInvoice.request }
  })
})

test('Summarise a transfer invoice between owned wallets', async () => {
  await clearDb()
  await db.wallets.bulkAdd([erinWallet, daveWallet])
  await db.invoices.bulkAdd([erinReceiveInvoice, daveTransferredToErinInvoice])

  const summary = await deriveInvoiceSummary(daveTransferredToErinInvoice)

  const { completedAt, amount, fee } = daveTransferredToErinInvoice

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
  await db.invoices.bulkAdd([daveTransferredToErinInvoice])

  const summary = await deriveInvoiceSummary(daveTransferredToErinInvoice)

  const { completedAt, amount, fee } = daveTransferredToErinInvoice

  expect(summary).toStrictEqual({
    timestamp: completedAt,
    fee: fee || 0,
    category: 'expense',
    type: 'send',
    amount,
    primary: { type: 'wallet', value: daveWallet },
    secondary: { type: 'unknown', value: daveTransferredToErinInvoice.nodeId }
  })
})

const erinsPayOffer = {
  id: '5289ed1cf473ac17d128be48655a85754bb7fb08b0dc5bbc84a6a76dfead58c6',
  bolt12:
    'lno1qgsqvgnwgcg35z6ee2h3yczraddm72xrfua9uve2rlrm9deu7xyfzrc2zpzhy6twu2qfjueqw35hqgr2v9epyzz9wf5kutnrdak3vggrzus45aj0dcvz69xh06dq53stnw9efjar0v67pydv3xlg7pgsm2ms',
  type: 'pay',
  denomination: 'sats',
  description: 'Erin’s tip jar',
  walletId: 'abeab0d8cd9d606babaa3f7a7d14844f00af70c23a646487cd6ee76e24582acf',
  used: false,
  singleUse: false,
  active: true,
  label: 'Tips',
  issuer: 'Erin.com'
} as Offer

const davesCopyOfOfferInvoicePaidToErin = {
  id: 'f11fb0bf42dc96cb7eb7bccae619d789a8b03c515bbe7a5f015ea41b34e11f32',
  hash: '7e946ada76fdc4e56067d07f01b359617651405e9918f6bb36fe1b6711191ef8',
  preimage: '75e14473baabbdb1e1871d7f8773c88fafce56097c9f65611428eb59156cf1e2',
  nodeId: '0317215a764f6e182d14d77e9a0a460b9b8b94cba37b35e091ac89be8f0510dab7',
  type: 'bolt12',
  direction: 'send',
  amount: 21,
  completedAt: 1695524983,
  createdAt: 1695524981.486,
  fee: 0,
  status: 'complete',
  request:
    'lni1qqgz4rh42zs0m5fll35n2x5q2pnjyq3qqc3xu3s3rg94nj40zfsy866mhu5vxne6tcej5878k2mneuvgjy8s5yz9wf5kac5qn9ejqarfwqsx5ctjzgyy2unfdchxxmmdzcssx9eptfmy7msc952dwl56pfrqhxutjn96x7e4uzg6ezd73uz3pk4h2qsqvgnwgcg35z6ee2h3yczraddm72xrfua9uve2rlrm9deu7xyfzr6jqffqskppqd0sttcj0fzd8th49thhxflpvu88j7fjmrkw89dhj9tkerlmlw056kfzfpjhye0zszvhxgrpyp6xjupqveex7mfq09hh2u3qd4shgefqg3shvedqnqp3wg26we8kuxpdznthaxs2gc9ehzu5ew3hkd0qjxkgn050q5gd4dcrumgruandrfyvsrrcmf2j2epqvxzvfg6z0wxky0aw2qnpzq35rdaszqhkz2e6pshe8pfteysrctvu887h9fd9dkhw4r44ulu2zhsw5mjsysqr938ltxlzfsmhfarlrzek6jldu0vg65phrk89k9y8ayfltpm9d3fsahqthdz4xxt227c6vuefrzfrqk2t0gsuqqqqqqqqqqqqqqq2qqqqqqqqqqqqq8fykt06c5sqqqqqpfqyv586sadgyplfg6k6wm7ufetqvlg87qdnt9shv52qt6v33a4mxmlpkec3ry0032sz2gytqggrzus45aj0dcvz69xh06dq53stnw9efjar0v67pydv3xlg7pgsm2mlqsprk2uth3pr5g3n0gl54vtedpplm4l2cwqkq9ace0usw8vjefhy8ut7ja47kqfa4ur8r4dkhvnas68jteaeerztz70h7h0astvdu7mqj',
  walletId: '65d27be876a0b28d635fc43d2e809ab71b6fa91bfe18d19524fcfd6b35b17fc8'
} as Invoice

const daveWithdrawOffer = {
  id: '879a16b45bda179bc43e46638f3c3e09eac31f8404d82b30e7579749ae909a40',
  walletId: '65d27be876a0b28d635fc43d2e809ab71b6fa91bfe18d19524fcfd6b35b17fc8',
  bolt12:
    'lnr1qqgtsz0gw30ll9dkwrjwu60rdxnhszsdxgcjqumpwss8yetxw4hxgrsyv5g04ucjppjxzan99e3k7m2syqrzymjxzydqkkw24ufxqslttwlj3s608f0rx2slc7etw0833zgs75sz2gy9sggzwxchnk47zgdgxs4gkawk0a9m03kvkx9qupm8vw6g4w6q9cxrg4f0qszpr52shyk68hfau3jjqkmk97hm7szf7cv5hxk6xk8swftvnwnw49kawnrmzaqayd0st2t7mcupkrx5rvf9cpv3d6ck37cmmp5y0am0c',
  type: 'withdraw',
  expiry: 1695611635,
  description: '21 sat refund',
  issuer: 'dave.com',
  denomination: 'sats',
  amount: 21,
  receiveNodeId: '0271b179dabe121a8342a8b75d67f4bb7c6ccb18a0e076763b48abb402e0c34552',
  active: false,
  single_use: true,
  used: true,
  label: 'Refund for Erin'
} as Offer

const davePaidWithdrawOfferToErinInvoice = {
  id: '0053cdcc7b619031c2cc448388663a53dde6d0d7f9de40e01a7c5def420b7aab',
  request:
    'lni1qqgtsz0gw30ll9dkwrjwu60rdxnhszsdxgcjqumpwss8yetxw4hxgrsyv5g04ucjppjxzan99e3k7m2syqrzymjxzydqkkw24ufxqslttwlj3s608f0rx2slc7etw0833zgs75sz2gy9sggzwxchnk47zgdgxs4gkawk0a9m03kvkx9qupm8vw6g4w6q9cxrg4f2pxqrzus45aj0dcvz69xh06dq53stnw9efjar0v67pydv3xlg7pgsm2ms8j4kvv3vtfcnr2a35c3pkwhh2hwfy4lhschjat5hcvpgzxnvjwlzqypct5ge5w53auvaurn0pu8j5a3ln0zfddf6hq8w7kkktp02u8g0yjcqxg4e49rgxt99h9p4dffn5ll6ughrjwukls35hfd3ykw6mwdhg0mrp9awvm988n2p2lg6deul86v2fmnxd63pcqqqqqqqqqqqqqqq5qqqqqqqqqqqqqwjfvkl43fqqqqqqzjqgeg04xj6vq264qs9dtgh6h5smpeahxsnmrcuw7l0xcmpzpvekvxmhf36w4f8cta2fja2qffq3vppqvtjzknkfahpstg56alf5zjxpwdch9xt5dantcy34jymarc9zrdt0uzq34m95l866sp0gtrtaeyrahmq04m6fx5p207jyk45lq2nsf4vjyarns9523zkeazqauy3jlrs326s7yafvamxsmqa982ltm0xyrvkejc',
  hash: '56ad17d5e90d873db9a13d8f1c77bef3636110599b30dbba63a75527c2faa4cb',
  direction: 'receive',
  type: 'bolt12',
  preimage: 'bae6655f1958b65459a5dda56c224d5e1fb87423e567de8bb1df32c9f19e8234',
  amount: 21,
  status: 'complete',
  completedAt: 1695525285,
  expiresAt: 1695525375,
  description: '21 sat refund',
  nodeId: '0271b179dabe121a8342a8b75d67f4bb7c6ccb18a0e076763b48abb402e0c34552',
  createdAt: 1695525285,
  payIndex: 3,
  offer: { issuer: 'dave.com', description: '21 sat refund' },
  walletId: 'abeab0d8cd9d606babaa3f7a7d14844f00af70c23a646487cd6ee76e24582acf'
} as Invoice
