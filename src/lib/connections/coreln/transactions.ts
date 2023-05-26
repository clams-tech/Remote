import type { SendTransactionOptions, Transaction } from '$lib/@types/transactions.js'
import type { ListTransactionsResponse, NewAddrResponse, WithdrawResponse } from './types.js'
import type { CorelnConnectionInterface, TransactionsInterface } from '../interfaces.js'
import Big from 'big.js'
import { merge, Subject, takeUntil } from 'rxjs'

class Transactions implements TransactionsInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  async get(): Promise<Transaction[]> {
    const listTransactionsResponse = await this.connection.rpc({ method: 'listtransactions' })
    const { transactions } = listTransactionsResponse as ListTransactionsResponse

    return transactions.map(
      ({ hash, rawtx, blockheight, txindex, locktime, version, inputs, outputs }) => {
        const rbfEnabled = !!inputs.find(({ sequence }) => sequence < Number('0xffffffff') - 1)

        return {
          hash,
          rawtx,
          blockheight,
          txindex,
          locktime,
          version,
          rbfEnabled,
          inputs: inputs.map(({ txid, index, sequence }) => ({ txid, index, sequence })),
          outputs: outputs.map(({ index, amount_msat }) => ({ index, amount_msat })),
          nodeId: this.connection.info.id
        }
      }
    )
  }

  async receive(): Promise<string> {
    const address = await this.connection.rpc({ method: 'newaddr' })
    const { bech32 } = address as NewAddrResponse

    return bech32
  }

  async send(options: SendTransactionOptions): Promise<Transaction> {
    const { amount, address, feeRate, utxos } = options
    const feerate = feeRate ? `${feeRate * 1000}perkb` : undefined

    const withdrawResult = await this.connection.rpc({
      method: 'withdraw',
      params: {
        destination: address,
        satoshi: Big(amount).div(1000).toString(),
        feerate,
        utxos
      }
    })

    const { txid } = withdrawResult as WithdrawResponse
    const transactions = await this.get()
    const transaction = transactions.find(({ hash }) => hash === txid)

    return transaction as Transaction
  }

  // @TODO - need to test this works correctly and without memory leaks
  async listenForTransactionConfirmation(transaction: Transaction): Promise<Transaction> {
    return new Promise((resolve, reject) => {
      const stopListening$ = new Subject<void>()
      const complete$ = merge(stopListening$, this.connection.destroy$)

      this.connection.blocks.blockHeight$.pipe(takeUntil(complete$)).subscribe(async () => {
        const transactions = await this.get()
        const tx = transactions.find(({ hash }) => hash === transaction.hash)

        if (!tx) {
          reject(`Could not find transaction for hash: ${transaction.hash}`)
        } else if (tx.blockheight) {
          stopListening$.next()
          resolve(tx)
        }
      })
    })
  }
}

export default Transactions
