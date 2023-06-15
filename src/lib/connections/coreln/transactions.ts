import type { SendTransactionOptions, Transaction } from '$lib/@types/transactions.js'
import type {
  CorelnConnectionInterface,
  CoreLnError,
  ListTransactionsResponse,
  NewAddrResponse,
  WithdrawResponse
} from './types.js'
import type { ConnectionError, TransactionsInterface } from '../interfaces.js'
import Big from 'big.js'
import { merge, Subject, takeUntil } from 'rxjs'
import handleError from './error.js'
import { nowSeconds } from '$lib/utils.js'

class Transactions implements TransactionsInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  async get(): Promise<Transaction[]> {
    try {
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
            outputs: outputs.map(({ index, amount_msat, scriptPubKey }) => ({
              index,
              amount: amount_msat,
              scriptPubKey
            })),
            connectionId: this.connection.info.connectionId
          }
        }
      )
    } catch (error) {
      const context = 'get (transactions)'
      throw handleError(error as CoreLnError, context)
    }
  }

  async receive(): Promise<string> {
    try {
      const address = await this.connection.rpc({ method: 'newaddr' })
      const { bech32 } = address as NewAddrResponse

      return bech32
    } catch (error) {
      const context = 'receive (transactions)'
      throw handleError(error as CoreLnError, context)
    }
  }

  async send(options: SendTransactionOptions): Promise<Transaction> {
    try {
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
    } catch (error) {
      const context = 'send (transactions)'
      throw handleError(error as CoreLnError, context)
    }
  }

  // @TODO - need to test this works correctly and is without memory leaks
  async listenForTransactionConfirmation(transaction: Transaction): Promise<Transaction> {
    return new Promise((resolve, reject) => {
      const stopListening$ = new Subject<void>()
      const complete$ = merge(stopListening$, this.connection.destroy$)

      this.connection.blocks.blockHeight$.pipe(takeUntil(complete$)).subscribe(async () => {
        try {
          const transactions = await this.get()
          const tx = transactions.find(({ hash }) => hash === transaction.hash)

          if (!tx) {
            const connectionError: ConnectionError = {
              key: 'connection_transaction_not_found',
              detail: {
                timestamp: nowSeconds(),
                message: `Could not find transaction for hash: ${transaction.hash}`,
                context: 'listenForTransactionConfirmation (transactions)'
              }
            }

            reject(connectionError)
          } else if (tx.blockheight) {
            stopListening$.next()
            resolve(tx)
          }
        } catch (error) {
          reject(error)
        }
      })
    })
  }
}

export default Transactions
