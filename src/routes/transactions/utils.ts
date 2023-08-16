import type { Transaction } from '$lib/@types/transactions.js'
import { db } from '$lib/db.js'
import Big from 'big.js'

export const calculateTransactionBalanceChange = async (
  transaction: Transaction
): Promise<{ abs: '+' | '-'; balanceChange: string }> => {
  const spentUtxos = (
    await Promise.all(transaction.inputs.map(({ txid, index }) => db.utxos.get(`${txid}:${index}`)))
  ).filter((x) => !!x)

  const unspentUtxos = (
    await Promise.all(
      transaction.outputs.map(({ index }) => db.utxos.get(`${transaction.id}:${index}`))
    )
  ).filter((x) => !!x)

  const ourUnspentOutputsTotal = unspentUtxos.reduce(
    (total, utxo) => (utxo ? total.add(utxo.amount) : total),
    new Big(0)
  )

  const outputsTotal = transaction.outputs.reduce(
    (total, { amount }) => total.plus(amount),
    new Big(0)
  )

  const fee = transaction.events.find(({ type }) => type === 'fee')

  // receive
  if (spentUtxos.length === 0) {
    return { abs: '+', balanceChange: ourUnspentOutputsTotal.toString() }
  }

  return {
    abs: '-',
    balanceChange: outputsTotal
      .minus(ourUnspentOutputsTotal)
      .plus(fee ? fee.amount : '0')
      .toString()
  }
}
