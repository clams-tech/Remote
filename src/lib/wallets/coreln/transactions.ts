import type { TransactionsInterface } from '../interfaces.js'
import type { AppError } from '$lib/@types/errors.js'
import Big from 'big.js'
import { merge, Subject, takeUntil } from 'rxjs'
import handleError from './error.js'
import { nowSeconds } from '$lib/utils.js'
import { formatMsatString } from './utils.js'
import { Transaction as BitcoinTransaction } from 'bitcoinjs-lib/src/transaction'
import { fromOutputScript } from 'bitcoinjs-lib/src/address'
import type { SendTransactionOptions, Transaction } from '$lib/@types/transactions.js'
import { msatsToSats } from '$lib/conversion.js'
import { initEccLib, networks } from 'bitcoinjs-lib'
import secp256k1 from '@bitcoinerlab/secp256k1'

// required to be init at least once to derive taproot addresses
initEccLib(secp256k1)

import type {
  ChainEvent,
  ChannelCloseEvent,
  ChannelOpenEvent,
  CorelnConnectionInterface,
  CoreLnError,
  DelayedToUsEvent,
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

      return transactions.map(
        ({ hash, rawtx, blockheight, txindex, locktime, version, inputs, outputs }) => {
          const rbfEnabled = !!inputs.find(({ sequence }) => sequence < Number('0xffffffff') - 1)
          const bitcoinTransaction = BitcoinTransaction.fromHex(rawtx)

          const fees: string[] = []
          let channel: Transaction['channel']
          let timestamp = nowSeconds()

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
                | DelayedToUsEvent

              const { txid, outpoint } = ev as ChainEvent

              if (type === 'chain') {
                if (tag === 'deposit' && outpoint.split(':')[0] === hash) {
                  timestamp = eventTimestamp
                  return
                }

                if (tag === 'withdrawal' && txid === hash) {
                  timestamp = eventTimestamp
                  return
                }

                if (tag === 'channel_open' && outpoint.includes(hash)) {
                  timestamp = eventTimestamp

                  channel = {
                    type: 'open',
                    amount: msatsToSats(formatMsatString(credit_msat)),
                    id: account
                  }
                  return
                }

                if (tag === 'channel_close' && txid === hash) {
                  timestamp = eventTimestamp

                  channel = {
                    type: 'close',
                    amount: msatsToSats(formatMsatString(debit_msat)),
                    id: account
                  }
                  return
                }

                if (tag === 'delayed_to_us' && outpoint.includes(hash)) {
                  if (channel) {
                    channel.type = 'force_close'
                  }
                }
              } else if (type === 'onchain_fee' && txid === hash) {
                fees.push(
                  credit_msat ? formatMsatString(credit_msat) : `-${formatMsatString(debit_msat)}`
                )

                return
              }
            })
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
            outputs: outputs.map(({ index, amount_msat }) => {
              let address: string

              try {
                address = fromOutputScript(bitcoinTransaction.outs[index].script, networks.bitcoin)
              } catch (error) {
                address = ''
                const context = 'get (transactions)'

                this.connection.errors$.next({
                  key: 'connection_derive_output_address',
                  detail: {
                    message: 'Could not derive address from output script',
                    context,
                    walletId: this.connection.walletId,
                    timestamp: nowSeconds()
                  }
                })
              }

              return {
                index,
                amount: msatsToSats(formatMsatString(amount_msat)),
                address
              }
            }),
            walletId: this.connection.walletId,
            timestamp,
            channel,
            fee: fees.length
              ? msatsToSats(
                  fees.reduce((total, msat) => {
                    return Big(total).plus(msat).toString()
                  }, '0')
                )
              : undefined
          } as Transaction
        }
      )
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
