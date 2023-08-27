import type { Invoice } from '$lib/@types/invoices.js'
import type { Transaction } from '$lib/@types/transactions.js'
import { db } from '$lib/db.js'
import { connections$ } from '$lib/streams.js'
import type { Movement } from './@types/movement.js'

export const deriveTransactionMovement = async (transaction: Transaction): Promise<Movement> => {
  const inputsWithOwnedUtxo = await Promise.all(
    transaction.inputs.map(async (input) => {
      const { txid, index } = input
      const utxo = await db.utxos.get(`${txid}:${index}`)
      return { ...input, utxo }
    })
  )

  const outputsWithOwnedUtxo = await Promise.all(
    transaction.outputs.map(async (output) => {
      const { index } = output
      const utxo = await db.utxos.get(`${transaction.id}:${index}`)
      return { ...output, utxo }
    })
  )

  const ourOutputUtxoTotal = outputsWithOwnedUtxo.reduce(
    (total, { utxo }) => (utxo ? total + utxo.amount : total),
    0
  )

  const outputsTotal = transaction.outputs.reduce((total, { amount }) => total + amount, 0)

  // find the first spent input with an owned utxo
  const firstInputWithSpentUtxo = inputsWithOwnedUtxo.find(({ utxo }) => !!utxo)

  // find the first output with an owned utxo that is transferred to another connection
  const firstOutputWithTransferUtxo = outputsWithOwnedUtxo.find(
    ({ utxo }) =>
      utxo && (!firstInputWithSpentUtxo || firstInputWithSpentUtxo.utxo?.walletId !== utxo.walletId)
  )

  // find the first output address that does not have an owned utxo (send)
  const firstOutputSendAddress = outputsWithOwnedUtxo.find(({ utxo }) => !utxo)?.address as string

  const withdrawal = await db.withdrawals
    .where('destination')
    .anyOf(outputsWithOwnedUtxo.map(({ address }) => address))
    .first()

  const deposit = await db.deposits
    .where('destination')
    .anyOf(transaction.outputs.map(({ address }) => address))
    .first()

  const fromWallet = firstInputWithSpentUtxo?.utxo?.walletId || withdrawal?.walletId
  const toWallet = firstOutputWithTransferUtxo?.utxo?.walletId || deposit?.walletId

  const from = fromWallet || undefined
  const to = toWallet || firstOutputSendAddress

  // no known spent utxo, so must be receive
  if (!firstInputWithSpentUtxo) {
    return {
      category: 'income',
      balanceChange: ourOutputUtxoTotal,
      from,
      timestamp: transaction.timestamp
    }
  }

  const balanceChange = outputsTotal - ourOutputUtxoTotal + (transaction.fee || 0)

  return {
    timestamp: transaction.timestamp,
    balanceChange,
    category: transaction.channel
      ? transaction.fee
        ? 'expense'
        : undefined
      : firstOutputWithTransferUtxo
      ? 'transfer'
      : 'expense',
    from,
    to
  }
}

export const deriveInvoiceMovement = ({
  direction,
  amount,
  fee,
  nodeId,
  walletId,
  createdAt,
  completedAt
}: Invoice): Movement => {
  const rebalancedToWallet =
    direction === 'send' ? connections$.value.find(({ info }) => info.id === nodeId) : undefined

  return {
    timestamp: completedAt || createdAt,
    category: direction === 'send' ? 'expense' : 'income',
    balanceChange: amount + (fee || 0),
    from: direction === 'receive' ? undefined : walletId,
    to: direction === 'receive' ? walletId : rebalancedToWallet?.walletId || nodeId
  }
}
