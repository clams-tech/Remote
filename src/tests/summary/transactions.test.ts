import { expect, test } from 'vitest'
import 'fake-indexeddb/auto'
import { deriveTransactionSummary } from '$lib/summary.js'
import { db } from '$lib/db.js'
import type { Wallet } from '$lib/@types/wallets.js'
import type { Transaction } from '$lib/@types/transactions.js'
import type { Utxo } from '$lib/@types/utxos.js'
import { truncateValue } from '$lib/utils.js'
import type { Channel } from '$lib/@types/channels.js'

const clearDb = () => Promise.all(db.tables.map((table) => table.clear()))

const aliceWallet = {
  id: '08b5a6168b5cce5d3819339ad98dcb80ee7041b6f43cfa246103a1264855db54',
  label: 'Alice',
  type: 'coreln',
  createdAt: 1694922217,
  modifiedAt: 1694922245,
  configuration: {
    address: '02a9805541255ca61273a5c61b5e633a2e1ac38d68bcd6b2106f9acd888d9f2150@localhost:7000',
    connection: { type: 'direct', value: 'ws:' },
    token:
      'U2FsdGVkX1/OEFnF5os+lw6EhDnHaQXa6LTSpeBPv562psaJEd+tFSOLqA5Mb1PG42AcKGCc/YCmFkO5rjEw/3cn0UX9/2vHZfwK5bWz2PA='
  },
  lastSync: 1694922619,
  syncing: false,
  nodeId: '02a9805541255ca61273a5c61b5e633a2e1ac38d68bcd6b2106f9acd888d9f2150'
} as Wallet

const bobWallet = {
  id: '9805d743a72a61e31132e2ed588222a8edd7e31e4181030393df062c82c4d4c5',
  label: 'Bob',
  type: 'coreln',
  createdAt: 1694925758,
  modifiedAt: 1694925809,
  configuration: {
    address: '021bac0a6a6e0d2fba61dc423b57cc44abc8b216c8ebd1a9ddeb6f32bb7c0ea721@localhost:7001',
    connection: { type: 'direct', value: 'ws:' },
    token: 'Pj2hiONzc-I9_0cO8dvhq7RFkrc4a2ce8eQRVELZpos9MA=='
  },
  lastSync: 1694925862,
  syncing: false,
  nodeId: '021bac0a6a6e0d2fba61dc423b57cc44abc8b216c8ebd1a9ddeb6f32bb7c0ea721'
} as Wallet

const onchainReceiveTransaction = {
  id: '55bbb7e8d534aa863c32d03b9862e919b125ee5670bc5980900ae1cbed898e6f',
  rawtx:
    '02000000000101c04c8b5d88bb321a1f57b492111fa4e975bb601c45b5cd34310e92bed7629cbc0000000000fdffffff02fccb4e2901000000160014cad08d3d421219d17922685fb51dc120a69ed77b001bb7000000000016001471506e129f819e519e58040afa24dc122646e2ec0247304402200cded4978e629b9c03dbd8f51ac3d2bad7eeac41dc6d01c60b02d0a6a01d4ab702206e83a54259a6ff1f0f1b05b0a9a8c13928da78e81b5b0fb3f0eaf12e7fc954280121021873a1fc799fe48a45fa334f1535eb7f4deabb6e037dd82a48dab82364c785ec65000000',
  blockheight: 102,
  txindex: 1,
  locktime: 101,
  version: 2,
  rbfEnabled: true,
  inputs: [
    {
      txid: 'bc9c62d7be920e3134cdb5451c60bb75e9a41f1192b4571f1a32bb885d8b4cc0',
      index: 0,
      sequence: 4294967293
    }
  ],
  outputs: [
    { index: 0, amount: 4987997180, address: 'bcrt1qetgg602zzgvaz7fzdp0m28wpyznfa4mmnr5er6' },
    { index: 1, amount: 12000000, address: 'bcrt1qw9gxuy5lsx09r8jcqs905fxuzgnydchvyr7e62' }
  ],
  walletId: '08b5a6168b5cce5d3819339ad98dcb80ee7041b6f43cfa246103a1264855db54',
  timestamp: 1694922369
} as Transaction

const utxoForOnchainReceiveTransaction = {
  address: 'bcrt1qw9gxuy5lsx09r8jcqs905fxuzgnydchvyr7e62',
  amount: 12000000,
  blockHeight: 102,
  id: '55bbb7e8d534aa863c32d03b9862e919b125ee5670bc5980900ae1cbed898e6f:1',
  output: 1,
  scriptpubkey: '001471506e129f819e519e58040afa24dc122646e2ec',
  spendingTxid: undefined,
  status: 'confirmed',
  timestamp: 1694922369,
  txid: '55bbb7e8d534aa863c32d03b9862e919b125ee5670bc5980900ae1cbed898e6f',
  walletId: '08b5a6168b5cce5d3819339ad98dcb80ee7041b6f43cfa246103a1264855db54'
} as Utxo

const onchainSendTransaction = {
  id: '30155fb92da23b177f1bad5ab82dea04326bc9da7b940a8267eb3ecb10310b24',
  rawtx:
    '020000000001016f8e89edcbe10a908059bc7056ee25b119e962983bd0323c86aa34d5e8b7bb550100000000fdffffff026bc8b60000000000160014057a7454d4b4c3efbbe1a5627e7b2a6a8af337dd0852000000000000160014cdadbc461cb54b1c802b48cb294477327bb2312a02473044022001bce1630c8931153d4778d4cc2c58afe1f4c01a65e9090dd8fd3432ea50264b0220627860a2315dff8cdb35398faa875be38611e12ce01047f392565d431140782701210327b1797d7592edc0a2e9515de4e0cdd99662d556ab4597951f08616a15aec7906b000000',
  blockheight: 108,
  txindex: 1,
  locktime: 107,
  version: 2,
  rbfEnabled: true,
  inputs: [
    {
      txid: '55bbb7e8d534aa863c32d03b9862e919b125ee5670bc5980900ae1cbed898e6f',
      index: 1,
      sequence: 4294967293
    }
  ],
  outputs: [
    { index: 0, amount: 11978859, address: 'bcrt1qq4a8g4x5knp7lwlp5438u7e2d290xd7a5jdfjl' },
    { index: 1, amount: 21000, address: 'bcrt1qekkmc3suk493eqptfr9jj3rhxfamyvf2s8rzgj' }
  ],
  walletId: '08b5a6168b5cce5d3819339ad98dcb80ee7041b6f43cfa246103a1264855db54',
  timestamp: 1694924419,
  fee: 141
} as Transaction

const utxoChangeFromOnchainSendTransaction = {
  address: 'bcrt1qq4a8g4x5knp7lwlp5438u7e2d290xd7a5jdfjl',
  amount: 11978859,
  blockHeight: undefined,
  id: '30155fb92da23b177f1bad5ab82dea04326bc9da7b940a8267eb3ecb10310b24:0',
  output: 0,
  scriptpubkey: '0014057a7454d4b4c3efbbe1a5627e7b2a6a8af337dd',
  spendingTxid: undefined,
  status: 'unconfirmed',
  timestamp: null,
  txid: '30155fb92da23b177f1bad5ab82dea04326bc9da7b940a8267eb3ecb10310b24',
  walletId: '08b5a6168b5cce5d3819339ad98dcb80ee7041b6f43cfa246103a1264855db54'
} as Utxo

const utxoBobReceivedOnchainSendTransaction = {
  id: '30155fb92da23b177f1bad5ab82dea04326bc9da7b940a8267eb3ecb10310b24:1',
  txid: '30155fb92da23b177f1bad5ab82dea04326bc9da7b940a8267eb3ecb10310b24',
  output: 1,
  amount: 21000,
  scriptpubkey: '0014cdadbc461cb54b1c802b48cb294477327bb2312a',
  address: 'bcrt1qekkmc3suk493eqptfr9jj3rhxfamyvf2s8rzgj',
  status: 'confirmed',
  blockHeight: 108,
  walletId: '9805d743a72a61e31132e2ed588222a8edd7e31e4181030393df062c82c4d4c5',
  timestamp: 1694924419
} as Utxo

test('Summarise a onchain receive transaction with unknown input', async () => {
  await clearDb()
  await db.wallets.add(aliceWallet)
  await db.transactions.add(onchainReceiveTransaction)
  await db.utxos.add(utxoForOnchainReceiveTransaction)
  const { timestamp } = onchainReceiveTransaction
  const summary = await deriveTransactionSummary(onchainReceiveTransaction)

  expect(summary).toStrictEqual({
    timestamp,
    fee: 0,
    category: 'income',
    type: 'receive',
    amount: utxoForOnchainReceiveTransaction.amount,
    primary: aliceWallet.label,
    secondary: '',
    inputs: [
      {
        category: 'unknown',
        id: 'bc9c62d7be920e3134cdb5451c60bb75e9a41f1192b4571f1a32bb885d8b4cc0:0'
      }
    ],
    outputs: [
      {
        category: 'unknown',
        id: onchainReceiveTransaction.outputs[0].address,
        amount: onchainReceiveTransaction.outputs[0].amount,
        address: onchainReceiveTransaction.outputs[0].address
      },
      {
        category: 'receive',
        id: utxoForOnchainReceiveTransaction.walletId,
        utxo: utxoForOnchainReceiveTransaction,
        amount: onchainReceiveTransaction.outputs[1].amount,
        address: onchainReceiveTransaction.outputs[1].address
      }
    ]
  })
})

test('Summarise a onchain send transaction to unknown recipient', async () => {
  await clearDb()
  await db.wallets.add(aliceWallet)
  await db.transactions.bulkAdd([onchainReceiveTransaction, onchainSendTransaction])
  await db.utxos.bulkAdd([utxoForOnchainReceiveTransaction, utxoChangeFromOnchainSendTransaction])
  const { timestamp } = onchainSendTransaction
  const summary = await deriveTransactionSummary(onchainSendTransaction)

  expect(summary).toStrictEqual({
    timestamp,
    fee: onchainSendTransaction.fee,
    category: 'expense',
    type: 'send',
    amount: onchainSendTransaction.outputs[1].amount,
    primary: aliceWallet.label,
    secondary: truncateValue(onchainSendTransaction.outputs[1].address),
    inputs: [
      {
        category: 'spend',
        id: utxoForOnchainReceiveTransaction.walletId,
        utxo: utxoForOnchainReceiveTransaction
      }
    ],
    outputs: [
      {
        category: 'change',
        id: utxoChangeFromOnchainSendTransaction.walletId,
        utxo: utxoChangeFromOnchainSendTransaction,
        amount: onchainSendTransaction.outputs[0].amount,
        address: onchainSendTransaction.outputs[0].address
      },
      {
        category: 'send',
        id: onchainSendTransaction.outputs[1].address,
        amount: onchainSendTransaction.outputs[1].amount,
        address: onchainSendTransaction.outputs[1].address
      }
    ]
  })
})

test('Summarise a onchain send transaction transfer to another owned wallet', async () => {
  await clearDb()
  await db.wallets.bulkAdd([aliceWallet, bobWallet])
  await db.transactions.bulkAdd([onchainReceiveTransaction, onchainSendTransaction])

  await db.utxos.bulkAdd([
    utxoForOnchainReceiveTransaction,
    utxoChangeFromOnchainSendTransaction,
    utxoBobReceivedOnchainSendTransaction
  ])

  const { timestamp } = onchainSendTransaction
  const summary = await deriveTransactionSummary(onchainSendTransaction)

  expect(summary).toStrictEqual({
    timestamp,
    fee: onchainSendTransaction.fee,
    category: 'expense',
    type: 'transfer',
    amount: onchainSendTransaction.outputs[1].amount,
    primary: aliceWallet.label,
    secondary: bobWallet.label,
    inputs: [
      {
        category: 'spend',
        id: utxoForOnchainReceiveTransaction.walletId,
        utxo: utxoForOnchainReceiveTransaction
      }
    ],
    outputs: [
      {
        category: 'change',
        id: utxoChangeFromOnchainSendTransaction.walletId,
        utxo: utxoChangeFromOnchainSendTransaction,
        amount: onchainSendTransaction.outputs[0].amount,
        address: onchainSendTransaction.outputs[0].address
      },
      {
        category: 'transfer',
        id: bobWallet.id,
        amount: onchainSendTransaction.outputs[1].amount,
        address: onchainSendTransaction.outputs[1].address,
        utxo: utxoBobReceivedOnchainSendTransaction
      }
    ]
  })
})

const aliceOpenChannelTransaction = {
  id: '873a28ae6a025174aee74915094049242b976ab9b35bbd18c936a9620bd20e38',
  rawtx:
    '02000000000101240b3110cb3eeb67820a947bdac96b3204ea2db85aad1b7f173ba22db95f15300000000000fdffffff0211018900000000001600143683132532611089b9f5be9732c936cb79834195c0c62d00000000002200202b9d282e77a89b767569894078d6998322c2bb3f629fc51f1a1ee6f7a5abfb100247304402207d3644227735ca5ffca7320b1e683638c8091625b9783c45a0ec14ebed35a0b00220247e50550b44efab9d8281bcfed78d7f7d2ff55cd2a07ce03ee0c99e82c8ad4f0121035ef2f175d8de41beb5e2632be16e119c1c38e17fa2b8fed5fa6da951051818146d000000',
  blockheight: 110,
  txindex: 1,
  locktime: 109,
  version: 2,
  rbfEnabled: true,
  inputs: [
    {
      txid: '30155fb92da23b177f1bad5ab82dea04326bc9da7b940a8267eb3ecb10310b24',
      index: 0,
      sequence: 4294967293
    }
  ],
  outputs: [
    { index: 0, amount: 8978705, address: 'bcrt1qx6p3xffjvyggnw04h6tn9jfkeducxsv4rxrxm9' },
    {
      index: 1,
      amount: 3000000,
      address: 'bcrt1q9wwjstnh4zdhvatf39q8345esv3v9welv20u28c6rmn00fdtlvgq9vs508'
    }
  ],
  walletId: '08b5a6168b5cce5d3819339ad98dcb80ee7041b6f43cfa246103a1264855db54',
  timestamp: 1694926410,
  channel: {
    type: 'open',
    amount: 3000000,
    id: '380ed20b62a936c918bd5bb3b96a972b244940091549e7ae7451026aae283a86'
  },
  fee: 154
} as Transaction

const changeUtxoFromChannelOpen = {
  id: '873a28ae6a025174aee74915094049242b976ab9b35bbd18c936a9620bd20e38:0',
  txid: '873a28ae6a025174aee74915094049242b976ab9b35bbd18c936a9620bd20e38',
  output: 0,
  amount: 8978705,
  scriptpubkey: '00143683132532611089b9f5be9732c936cb79834195',
  address: 'bcrt1qx6p3xffjvyggnw04h6tn9jfkeducxsv4rxrxm9',
  status: 'confirmed',
  blockHeight: 110,
  walletId: '08b5a6168b5cce5d3819339ad98dcb80ee7041b6f43cfa246103a1264855db54',
  timestamp: 1694926410
} as Utxo

const aliceBobChannel = {
  walletId: '08b5a6168b5cce5d3819339ad98dcb80ee7041b6f43cfa246103a1264855db54',
  opener: 'local',
  peerId: '021bac0a6a6e0d2fba61dc423b57cc44abc8b216c8ebd1a9ddeb6f32bb7c0ea721',
  peerConnected: true,
  fundingTransactionId: '873a28ae6a025174aee74915094049242b976ab9b35bbd18c936a9620bd20e38',
  fundingOutput: 1,
  id: '380ed20b62a936c918bd5bb3b96a972b244940091549e7ae7451026aae283a86',
  shortId: '110x1x1',
  status: 'active',
  balanceLocal: 3000000,
  balanceRemote: 0,
  reserveRemote: 30000,
  reserveLocal: 30000,
  feeBase: 0.001,
  feePpm: 10,
  closeToAddress: 'bcrt1qn6ce0vcagfvkt4ygyck6vj6lcts0g45h5ylhvt',
  closeToScriptPubkey: '00149eb197b31d425965d488262da64b5fc2e0f45697',
  htlcMin: 0,
  htlcMax: 2970000,
  ourToSelfDelay: 6,
  theirToSelfDelay: 6,
  htlcs: []
} as Channel

test('Summarise a onchain transaction that opens a channel to a node', async () => {
  await clearDb()
  await db.wallets.bulkAdd([aliceWallet])
  await db.transactions.bulkAdd([aliceOpenChannelTransaction])
  await db.utxos.bulkAdd([utxoChangeFromOnchainSendTransaction, changeUtxoFromChannelOpen])
  await db.channels.bulkAdd([aliceBobChannel])
  const { timestamp } = onchainSendTransaction
  const summary = await deriveTransactionSummary(onchainSendTransaction)

  expect(summary).toStrictEqual({
    timestamp,
    fee: onchainSendTransaction.fee,
    category: 'expense',
    type: 'transfer',
    amount: onchainSendTransaction.outputs[1].amount,
    primary: aliceWallet.label,
    secondary: bobWallet.label,
    inputs: [
      {
        category: 'spend',
        id: utxoChangeFromOnchainSendTransaction.walletId,
        utxo: utxoChangeFromOnchainSendTransaction
      }
    ],
    outputs: [
      {
        category: 'change',
        id: utxoChangeFromOnchainSendTransaction.walletId,
        utxo: utxoChangeFromOnchainSendTransaction,
        amount: onchainSendTransaction.outputs[0].amount,
        address: onchainSendTransaction.outputs[0].address
      },
      {
        category: 'transfer',
        id: bobWallet.id,
        amount: onchainSendTransaction.outputs[1].amount,
        address: onchainSendTransaction.outputs[1].address,
        utxo: utxoBobReceivedOnchainSendTransaction
      }
    ]
  })
})
