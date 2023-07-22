import type { SendTransactionOptions, Transaction } from '$lib/@types/transactions.js'
import type { TransactionsInterface } from '../interfaces.js'
import type { AppError } from '$lib/@types/errors.js'
import Big from 'big.js'
import { merge, Subject, takeUntil } from 'rxjs'
import handleError from './error.js'
import { nowSeconds } from '$lib/utils.js'

import type {
  ChainEvent,
  ChannelOpenEvent,
  CorelnConnectionInterface,
  CoreLnError,
  ListAccountEventsResponse,
  ListTransactionsResponse,
  NewAddrResponse,
  OnchainFeeEvent,
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

      return transactions.map(
        ({ hash, rawtx, blockheight, txindex, locktime, version, inputs, outputs }) => {
          const rbfEnabled = !!inputs.find(({ sequence }) => sequence < Number('0xffffffff') - 1)

          const event: {
            channelOpen: ChannelOpenEvent
            chain: ChainEvent
            fees: OnchainFeeEvent[]
          } | null =
            accountEvents &&
            accountEvents.events.reduce((acc, ev) => {
              const { type, tag } = ev as ChainEvent | ChannelOpenEvent | OnchainFeeEvent
              const { txid, outpoint } = ev as ChainEvent

              if (type === 'chain') {
                if (tag === 'withdrawal' && txid === hash) {
                  acc.chain = ev as ChainEvent
                }

                if (tag === 'channel_open' && outpoint.includes(hash)) {
                  acc.channelOpen = ev as ChannelOpenEvent
                }
              } else if (type === 'onchain_fee' && txid === hash) {
                if (!acc.fees) {
                  acc.fees = []
                }

                acc.fees.push(ev as OnchainFeeEvent)
              }

              return acc
            }, {} as { channelOpen: ChannelOpenEvent; chain: ChainEvent; fees: OnchainFeeEvent[] })

          const fee = event?.fees
            ? event.fees.reduce((total, { credit_msat, debit_msat }) => {
                const fee = Big(credit_msat).minus(debit_msat)
                return Big(total).plus(fee).toString()
              }, '0')
            : null

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
            connectionId: this.connection.info.connectionId,
            timestamp: event?.chain?.timestamp || null,
            channel: event?.channelOpen?.account || undefined,
            fee
          }
        }
      )
    } catch (error) {
      const context = 'get (transactions)'

      const connectionError = handleError(
        error as CoreLnError,
        context,
        this.connection.info.connectionId
      )

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

      const connectionError = handleError(
        error as CoreLnError,
        context,
        this.connection.info.connectionId
      )

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

      const connectionError = handleError(
        error as CoreLnError,
        context,
        this.connection.info.connectionId
      )

      this.connection.errors$.next(connectionError)
      throw connectionError
    }
  }

  // @TODO - need to test this works correctly and is without memory leaks
  async listenForTransactionConfirmation(transaction: Transaction): Promise<Transaction> {
    return new Promise((resolve, reject) => {
      const stopListening$ = new Subject<void>()
      const complete$ = merge(stopListening$, this.connection.destroy$)

      this.connection.blocks.blockHeight$.pipe(takeUntil(complete$)).subscribe(async () => {
        /** when we get a new block height, we ask for all transactions again to see
         * if transaction has been included in a block
         */
        try {
          const transactions = await this.get()
          const tx = transactions.find(({ hash }) => hash === transaction.hash)

          /** can't find transaction, throw error */
          if (!tx) {
            const connectionError: AppError = {
              key: 'connection_transaction_not_found',
              detail: {
                timestamp: nowSeconds(),
                message: `Could not find transaction for hash: ${transaction.hash}`,
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
