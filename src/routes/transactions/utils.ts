import type { Channel } from '$lib/@types/channels.js'
import type { ConnectionDetails } from '$lib/@types/connections.js'
import type { Transaction, TransactionCategory } from '$lib/@types/transactions.js'
import type { Utxo } from '$lib/@types/utxos.js'
import { db } from '$lib/db.js'
import { truncateValue } from '$lib/utils.js'
import Big from 'big.js'

export const deriveOnchainTransactionDetails = async (
  transaction: Transaction
): Promise<{
  abs: '+' | '-'
  balanceChange: string
  category: TransactionCategory
  channel?: Channel
  from: string
  to: string
}> => {
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
    (await db.connections.get(firstOutputWithTransferUtxo.utxo.connectionId))

  const fromConnection =
    firstInputWithSpentUtxo &&
    firstInputWithSpentUtxo.utxo &&
    ((await db.connections.get(firstInputWithSpentUtxo.utxo.connectionId)) as ConnectionDetails)

  const to = toConnection?.label || truncateValue(firstOutputSendAddress, 6)
  const from = fromConnection?.label || 'unknown'

  // no known spent utxo, so must be receive
  if (!firstInputWithSpentUtxo) {
    return {
      abs: '+',
      balanceChange: ourOutputUtxoTotal.toString(),
      category: 'receive',
      from,
      to
    }
  }

  return {
    abs: '-',
    balanceChange: outputsTotal
      .minus(ourOutputUtxoTotal)
      .plus(transaction.fee ? transaction.fee : '0')
      .toString(),
    category:
      transaction.channel?.type === 'open'
        ? 'channel_open'
        : transaction.channel?.type === 'close'
        ? 'channel_close'
        : firstOutputWithTransferUtxo
        ? 'transfer'
        : 'send',
    to,
    from
  }
}
