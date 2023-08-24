import type { Invoice } from '$lib/@types/invoices.js'
import type { Metadata } from '$lib/@types/metadata.js'
import type { Transaction } from '$lib/@types/transactions.js'
import { db } from '$lib/db.js'
import { connections$ } from '$lib/streams.js'
import Big from 'big.js'

export const deriveTransactionMetadata = async (transaction: Transaction): Promise<Metadata> => {
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
    (total, { utxo }) => (utxo ? total.add(utxo.amount) : total),
    new Big(0)
  )

  const outputsTotal = transaction.outputs.reduce(
    (total, { amount }) => total.plus(amount),
    new Big(0)
  )

  // find the first spent input with an owned utxo
  const firstInputWithSpentUtxo = inputsWithOwnedUtxo.find(({ utxo }) => !!utxo)

  // find the first output with an owned utxo that is transferred to another connection
  const firstOutputWithTransferUtxo = outputsWithOwnedUtxo.find(
    ({ utxo }) =>
      utxo &&
      (!firstInputWithSpentUtxo || firstInputWithSpentUtxo.utxo?.connectionId !== utxo.connectionId)
  )

  // find the first output address that does not have an owned utxo (send)
  const firstOutputSendAddress = outputsWithOwnedUtxo.find(({ utxo }) => !utxo)?.address as string

  const toConnection =
    firstOutputWithTransferUtxo &&
    firstOutputWithTransferUtxo.utxo &&
    firstOutputWithTransferUtxo.utxo.connectionId

  const fromConnection =
    firstInputWithSpentUtxo &&
    firstInputWithSpentUtxo.utxo &&
    firstInputWithSpentUtxo.utxo.connectionId

  const to = toConnection || firstOutputSendAddress
  const from = fromConnection || undefined

  // no known spent utxo, so must be receive
  if (!firstInputWithSpentUtxo) {
    return {
      id: transaction.id,
      type: 'transaction',
      balanceChange: ourOutputUtxoTotal.toString(),
      tags: ['income'],
      counterparties: [from, undefined]
    }
  }

  return {
    id: transaction.id,
    type: 'transaction',
    balanceChange: outputsTotal
      .minus(ourOutputUtxoTotal)
      .plus(transaction.fee ? transaction.fee : '0')
      .toString(),
    tags: [
      transaction.channel
        ? transaction.fee
          ? 'expense'
          : 'neutral'
        : firstOutputWithTransferUtxo
        ? 'transfer'
        : 'expense'
    ],
    counterparties: [from, to]
  }
}

export const deriveInvoiceMetadata = async ({
  id,
  direction,
  amount,
  fee,
  nodeId,
  connectionId
}: Invoice): Promise<Metadata> => {
  const rebalancedToConnection =
    direction === 'send' ? connections$.value.find(({ info }) => info.id === nodeId) : undefined

  return {
    id,
    type: 'invoice',
    tags: [direction === 'send' ? 'expense' : 'income'],
    balanceChange: Big(amount === 'any' ? '0' : amount)
      .plus(fee || '0')
      .toString(),
    counterparties:
      direction === 'receive'
        ? [undefined, connectionId]
        : [connectionId, rebalancedToConnection?.connectionId || nodeId]
  }
}
