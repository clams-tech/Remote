import LnMessage from 'lnmessage'
import type { CommandoRequest, LnWebSocketOptions } from 'lnmessage/dist/types.js'
import type { Invoice } from '$lib/@types/invoices.js'
import { formatInvoice, formatMsatString, payToInvoice } from './utils.js'
import { msatsToSats } from '$lib/conversion.js'
import { hash } from '$lib/crypto.js'
import type { Network } from '$lib/@types/common.js'
import { Transaction as BitcoinTransaction } from 'bitcoinjs-lib/src/transaction'
import { fromOutputScript } from 'bitcoinjs-lib/src/address'
import type { Transaction } from '$lib/@types/transactions.js'
import { nowSeconds } from '$lib/utils.js'
import { initEccLib, networks } from 'bitcoinjs-lib'
import secp256k1 from '@bitcoinerlab/secp256k1'
import Big from 'big.js'

import type {
  ListForwardsResponse,
  Pay,
  RawInvoice,
  ChainEvent,
  ChannelCloseEvent,
  ChannelOpenEvent,
  DelayedToUsEvent,
  ListAccountEventsResponse,
  ListTransactionsResponse,
  OnchainFeeEvent,
  ToThemEvent
} from './types.js'

// required to be init at least once to derive taproot addresses
initEccLib(secp256k1)

type MessageBase = {
  id: string
}

type InitMessage = MessageBase & {
  type: 'init'
  data: LnWebSocketOptions
}

type ConnectMessage = MessageBase & {
  type: 'connect'
}

type DisconnectMessage = MessageBase & {
  type: 'disconnect'
}

type CommandoMessage = MessageBase & {
  type: 'commando'
  data: CommandoRequest
}

type FormatPaymentsMessage = MessageBase & {
  type: 'format_payments'
  invoices: RawInvoice[]
  pays: Pay[]
  walletId: string
}

type FormatForwardsMessage = MessageBase & {
  type: 'format_forwards'
  forwards: ListForwardsResponse['forwards']
  walletId: string
}

type FormatTransactionsMessage = MessageBase & {
  type: 'format_transactions'
  transactions: ListTransactionsResponse['transactions']
  accountEvents: ListAccountEventsResponse | null
  network: Network
  walletId: string
}

type Message =
  | InitMessage
  | ConnectMessage
  | DisconnectMessage
  | CommandoMessage
  | FormatPaymentsMessage
  | FormatForwardsMessage
  | FormatTransactionsMessage

let socket: LnMessage

onmessage = async (message: MessageEvent<Message>) => {
  switch (message.data.type) {
    case 'init': {
      socket = new LnMessage(message.data.data)
      socket.connectionStatus$.subscribe(status =>
        self.postMessage({ id: 'connectionStatus$', result: status })
      )

      self.postMessage({ id: message.data.id })
      return
    }
    case 'connect': {
      const result = await socket.connect()
      self.postMessage({ id: message.data.id, result })
      return
    }
    case 'disconnect': {
      socket.disconnect()
      self.postMessage({ id: message.data.id })
      return
    }
    case 'commando': {
      try {
        const result = await socket.commando(message.data.data)
        self.postMessage({ id: message.data.id, result })
        return
      } catch (error) {
        self.postMessage({ id: message.data.id, error })
        return
      }
    }
    case 'format_payments': {
      const { id, invoices, pays, walletId } = message.data

      const invoicePayments: Invoice[] = await Promise.all(
        invoices.map(invoice => formatInvoice(invoice, walletId))
      )

      const sentPayments: Invoice[] = await Promise.all(
        pays.map(pay => payToInvoice(pay, walletId))
      )

      self.postMessage({ id, result: invoicePayments.concat(sentPayments) })
      return
    }
    case 'format_forwards': {
      const { id, forwards, walletId } = message.data

      const result = forwards.map(
        ({
          in_channel,
          out_channel,
          in_htlc_id,
          out_htlc_id,
          in_msat,
          out_msat,
          fee_msat,
          status,
          style,
          received_time,
          resolved_time
        }) => {
          const forward = {
            shortIdIn: in_channel,
            shortIdOut: out_channel,
            htlcInId: in_htlc_id,
            htlcOutId: out_htlc_id,
            in: msatsToSats(formatMsatString(in_msat)),
            out: msatsToSats(formatMsatString(out_msat)),
            fee: msatsToSats(formatMsatString(fee_msat)),
            status,
            style,
            createdAt: received_time,
            completedAt: resolved_time,
            walletId
          }

          const id = hash(JSON.stringify(forward))

          return { ...forward, id }
        }
      )

      self.postMessage({ id, result })
      return
    }
    case 'format_transactions': {
      const { id, transactions, accountEvents, network, walletId } = message.data

      try {
        const result = transactions.map(
          ({ hash, rawtx, blockheight, txindex, locktime, version, inputs, outputs }) => {
            const rbfEnabled = !!inputs.find(({ sequence }) => sequence < Number('0xffffffff') - 1)
            const bitcoinTransaction = BitcoinTransaction.fromHex(rawtx)

            const fees: string[] = []
            let channel: Transaction['channel']
            let timestamp = nowSeconds()

            if (accountEvents) {
              accountEvents.events.forEach(ev => {
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
                  address = fromOutputScript(
                    bitcoinTransaction.outs[index].script,
                    networks[network === 'signet' ? 'testnet' : network]
                  )
                } catch (error) {
                  address = ''
                  const context = 'get (transactions)'

                  throw {
                    key: 'connection_derive_output_address',
                    detail: {
                      message: 'Could not derive address from output script',
                      context,
                      walletId,
                      timestamp: nowSeconds()
                    }
                  }
                }

                return {
                  index,
                  amount: msatsToSats(formatMsatString(amount_msat)),
                  address
                }
              }),
              walletId: walletId,
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

        self.postMessage({ id, result })

        return
      } catch (error) {
        self.postMessage({ id, error })
        return
      }
    }
    default: {
      throw new Error('Unknown message type')
    }
  }
}

export {}
