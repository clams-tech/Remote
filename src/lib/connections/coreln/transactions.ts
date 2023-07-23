import type {
  SendTransactionOptions,
  Transaction,
  TransactionEvent
} from '$lib/@types/transactions.js'
import type { TransactionsInterface } from '../interfaces.js'
import type { AppError } from '$lib/@types/errors.js'
import Big from 'big.js'
import { merge, Subject, takeUntil } from 'rxjs'
import handleError from './error.js'
import { nowSeconds } from '$lib/utils.js'

import type {
  ChainEvent,
  ChannelCloseEvent,
  ChannelOpenEvent,
  CorelnConnectionInterface,
  CoreLnError,
  ListAccountEventsResponse,
  ListTransactionsResponse,
  NewAddrResponse,
  OnchainFeeEvent,
  ToThemEvent,
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

      console.log({ transactions })
      console.log({ accountEvents })

      return transactions.map(
        ({ hash, rawtx, blockheight, txindex, locktime, version, inputs, outputs }) => {
          const rbfEnabled = !!inputs.find(({ sequence }) => sequence < Number('0xffffffff') - 1)

          const events: TransactionEvent[] = []
          const fees: string[] = []

          if (accountEvents) {
            accountEvents.events.forEach((ev) => {
              const {
                type,
                tag,
                timestamp: eventTimestamp,
                account,
                debit_msat,
                credit_msat
              } = ev as
                | ChainEvent
                | ChannelOpenEvent
                | ChannelCloseEvent
                | OnchainFeeEvent
                | ToThemEvent

              const { txid, outpoint } = ev as ChainEvent
              const { origin } = ev as ToThemEvent

              if (type === 'chain') {
                if (tag === 'deposit' && outpoint.split(':')[0] === hash) {
                  events.push({
                    type: 'deposit',
                    amount: credit_msat,
                    timestamp: eventTimestamp
                  })

                  return
                }

                if (tag === 'withdrawal' && txid === hash) {
                  events.push({
                    type: 'withdrawal',
                    amount: debit_msat,
                    timestamp: eventTimestamp
                  })

                  return
                }

                if (tag === 'channel_open' && outpoint.includes(hash)) {
                  events.push({
                    type: 'channelOpen',
                    amount: credit_msat,
                    timestamp: eventTimestamp,
                    channel: account
                  })

                  return
                }

                if (tag === 'channel_close' && txid === hash) {
                  events.push({
                    type: 'channelClose',
                    amount: debit_msat,
                    timestamp: eventTimestamp,
                    channel: account
                  })

                  return
                }

                if (tag === 'to_them' && outpoint.includes(hash)) {
                  events.push({
                    type: 'externalSettle',
                    amount: credit_msat,
                    timestamp: eventTimestamp,
                    channel: origin
                  })

                  return
                }
              } else if (type === 'onchain_fee' && txid === hash) {
                fees.push(credit_msat ? credit_msat : `-${debit_msat}`)
                return
              }
            })

            if (fees.length) {
              events.push({
                type: 'fee',
                amount: fees.reduce((total, msat) => {
                  return Big(total).plus(msat).toString()
                }, '0')
              })
            }
          }

          return {
            id: hash,
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
            events
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
      const transaction = transactions.find(({ id }) => id === txid)

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
