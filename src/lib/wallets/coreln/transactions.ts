import type { TransactionsInterface } from '../interfaces.js'
import type { AppError } from '$lib/@types/errors.js'
import { merge, Subject, takeUntil } from 'rxjs'
import handleError from './error.js'
import { nowSeconds } from '$lib/utils.js'
import type { SendTransactionOptions, Transaction } from '$lib/@types/transactions.js'
import { formatTransactions } from './worker.js'

import type {
  CorelnConnectionInterface,
  CoreLnError,
  ListAccountEventsResponse,
  ListTransactionsResponse,
  NewAddrResponse,
  WithdrawResponse
} from './types.js'

class Transactions implements TransactionsInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  async get(): Promise<Transaction[]> {
    try {
      const listTransactionsResponse = await this.connection.rpc({ method: 'listtransactions' })
      const { transactions } = listTransactionsResponse as ListTransactionsResponse
      let accountEvents: ListAccountEventsResponse | null

      try {
        accountEvents = (await this.connection.rpc({
          method: 'bkpr-listaccountevents'
        })) as ListAccountEventsResponse
      } catch (error) {
        // don't have permissions to get account events, so set to null
        accountEvents = null
      }

      const network = this.connection.info.network

      try {
        const formatted = await formatTransactions(
          transactions,
          accountEvents,
          network,
          this.connection.walletId
        )
        return formatted
      } catch (error) {
        this.connection.errors$.next(error as AppError)
        throw error
      }
    } catch (error) {
      const context = 'get (transactions)'
      const connectionError = handleError(error as CoreLnError, context, this.connection.walletId)

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }

  async receive(): Promise<string> {
    try {
      const address = await this.connection.rpc({ method: 'newaddr' })
      const { bech32 } = address as NewAddrResponse

      return bech32
    } catch (error) {
      const context = 'receive (transactions)'

      const connectionError = handleError(error as CoreLnError, context, this.connection.walletId)

      this.connection.errors$.next(connectionError)
      throw connectionError
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
          satoshi: amount,
          feerate,
          utxos
        }
      })

      const { txid } = withdrawResult as WithdrawResponse
      const transactions = await this.get()
      const transaction = transactions.find(({ id }) => id === txid)

      return transaction as Transaction
    } catch (error) {
      const context = 'send (transactions)'

      const connectionError = handleError(error as CoreLnError, context, this.connection.walletId)

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }

  // @TODO - need to test this works correctly and is without memory leaks
  async listenForTransactionConfirmation(transaction: Transaction): Promise<Transaction> {
    return new Promise(async (resolve, reject) => {
      const stopListening$ = new Subject<void>()
      const complete$ = merge(stopListening$, this.connection.destroy$)

      const blockHeight$ = await this.connection.blocks.subscribeToBlockHeight()

      blockHeight$.pipe(takeUntil(complete$)).subscribe(async () => {
        /** when we get a new block height, we ask for all transactions again to see
         * if transaction has been included in a block
         */
        try {
          const transactions = await this.get()
          const tx = transactions.find(({ id }) => id === transaction.id)

          /** can't find transaction, throw error */
          if (!tx) {
            const connectionError: AppError = {
              key: 'connection_transaction_not_found',
              detail: {
                timestamp: nowSeconds(),
                message: `Could not find transaction for hash: ${transaction.id}`,
                context: 'listenForTransactionConfirmation (transactions)'
              }
            }

            this.connection.errors$.next(connectionError)
            reject(connectionError)
          } else if (tx.blockheight) {
            stopListening$.next()
            resolve(tx)
          }
        } catch (error) {
          const connectionError: AppError = {
            key: 'connection_transactions_get',
            detail: {
              timestamp: nowSeconds(),
              message: (error as CoreLnError).message,
              context: 'listenForTransactionConfirmation (transactions)'
            }
          }

          this.connection.errors$.next(connectionError)
          reject(error)
        }
      })
    })
  }
}

export default Transactions
