import LnMessage from 'lnmessage'
import type { CommandoRequest, LnWebSocketOptions } from 'lnmessage/dist/types.js'
import { formatInvoice, formatMsatString, payToInvoice, stateToChannelStatus } from './utils.js'
import { msatsToSats } from '$lib/conversion.js'
import { hash } from '$lib/crypto.js'
import type { InvoicePayment, Network, TransactionPayment } from '$lib/@types/payments.js'
import { Transaction as BitcoinTransaction } from 'bitcoinjs-lib/src/transaction'
import { fromOutputScript } from 'bitcoinjs-lib/src/address'
import { getBlockTimestamp, nowSeconds } from '$lib/utils.js'
import { initEccLib, networks } from 'bitcoinjs-lib'
import secp256k1 from '@bitcoinerlab/secp256k1'
import Big from 'big.js'
import type { Channel } from '$lib/@types/channels.js'
import { inPlaceSort } from 'fast-sort'
import type { Utxo } from '$lib/@types/utxos.js'
import { distinctUntilChanged } from 'rxjs'
import type { Forward } from '$lib/@types/forwards.js'

import type {
  ListForwardsResponse,
  Pay,
  RawInvoice,
  ChainEvent,
  ListAccountEventsResponse,
  ListTransactionsResponse,
  ClosedChannel,
  ListNodesResponse,
  NodeFullResponse,
  ListPeersResponse,
  ListPeerChannelsResponse,
  ListfundsResponse
} from './types.js'

// required to be init at least once to derive taproot addresses
initEccLib(secp256k1)

type MessageBase = {
  id: string
}

type InitMessage = MessageBase & {
  type: 'init'
  socketId: string
  data: LnWebSocketOptions
}

type ConnectMessage = MessageBase & {
  socketId: string
  type: 'connect'
}

type DisconnectMessage = MessageBase & {
  socketId: string
  type: 'disconnect'
}

type CommandoMessage = MessageBase & {
  socketId: string
  type: 'commando'
  data: CommandoRequest
}

type GetChannelsMessage = MessageBase & {
  socketId: string
  type: 'get_channels'
  rune: string
  version: number
  walletId: string
  channel?: { id: string; peerId: string }
}

type FormatPaymentsMessage = MessageBase & {
  type: 'format_payments'
  invoices: RawInvoice[]
  pays: Pay[]
  walletId: string
  network: Network
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

type FormatUtxosMessage = MessageBase & {
  type: 'format_utxos'
  outputs: ListfundsResponse['outputs']
  accountEvents: ListAccountEventsResponse | null
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
  | GetChannelsMessage
  | FormatUtxosMessage

const sockets: Record<string, LnMessage> = {}

onmessage = async (message: MessageEvent<Message>) => {
  switch (message.data.type) {
    case 'init': {
      const socket = new LnMessage(message.data.data)
      sockets[message.data.socketId] = socket

      socket.connectionStatus$.pipe(distinctUntilChanged()).subscribe(status => {
        console.log('CONNECTION STATUS UPDATE:', status)
        self.postMessage({ id: 'connectionStatus$', result: status })
      })

      self.postMessage({ id: message.data.id })
      return
    }
    case 'connect': {
      const socket = sockets[message.data.socketId]
      const result = await socket.connect()
      self.postMessage({ id: message.data.id, result })
      return
    }
    case 'disconnect': {
      const socket = sockets[message.data.socketId]
      socket.disconnect()
      self.postMessage({ id: message.data.id })
      return
    }
    case 'commando': {
      try {
        const socket = sockets[message.data.socketId]
        const result = await socket.commando(message.data.data)
        self.postMessage({ id: message.data.id, result })
        return
      } catch (error) {
        self.postMessage({ id: message.data.id, error })
        return
      }
    }
    case 'format_payments': {
      const { id, invoices, pays, walletId, network } = message.data

      const invoicePayments: InvoicePayment[] = await Promise.all(
        invoices.map(invoice => formatInvoice(invoice, walletId, network))
      )

      const sentPayments: InvoicePayment[] = await Promise.all(
        pays.map(pay => payToInvoice(pay, walletId, network))
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
          const forward: Omit<Forward, 'id'> = {
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
            timestamp: resolved_time | received_time,
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
        const result = await Promise.all(
          transactions.map(
            async ({ hash, rawtx, blockheight, txindex, locktime, version, inputs, outputs }) => {
              const rbfEnabled = !!inputs.find(
                ({ sequence }) => sequence < Number('0xffffffff') - 1
              )
              const bitcoinTransaction = BitcoinTransaction.fromHex(rawtx)

              const formattedInputs: TransactionPayment['data']['inputs'] = inputs.map(
                ({ txid, index, sequence }) => ({ txid, index, sequence })
              )

              const formattedOutputs: TransactionPayment['data']['outputs'] = outputs.map(
                ({ index, amount_msat }) => {
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
                }
              )

              const fees: string[] = []
              let channel: TransactionPayment['data']['channel']
              let timestamp = null

              if (accountEvents) {
                accountEvents.events.forEach(ev => {
                  const {
                    type,
                    tag,
                    timestamp: eventTimestamp,
                    account,
                    debit_msat,
                    credit_msat
                  } = ev as ListAccountEventsResponse['events'][number]

                  const { txid, outpoint } = ev as ChainEvent
                  const [outpointHash, outpointIndex] = outpoint?.split(':') || []

                  if (type === 'chain') {
                    if (tag === 'deposit' && outpointHash === hash) {
                      timestamp = eventTimestamp
                      return
                    }

                    if (tag === 'withdrawal' && txid === hash) {
                      timestamp = eventTimestamp
                      return
                    }

                    if (tag === 'channel_open' && outpointHash === hash) {
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

                    if (tag === 'delayed_to_us' && outpointHash === hash) {
                      if (channel) {
                        channel.type = 'force_close'
                      }

                      formattedOutputs[Number(outpointIndex)].timelocked = true
                    }

                    if (tag === 'htlc_timeout' && outpointHash === hash) {
                      timestamp = eventTimestamp
                      formattedOutputs[Number(outpointIndex)].htlcTimeout = true
                      channel = {
                        type: 'htlc',
                        id: account,
                        amount: formattedOutputs[Number(outpointIndex)].amount
                      }
                    }

                    if (tag === 'htlc_tx' && outpointHash === hash) {
                      timestamp = eventTimestamp
                      formattedOutputs[Number(outpointIndex)].htlcResolve = true
                      formattedInputs[0].htlcTimeout = true
                      channel = {
                        type: 'htlc',
                        id: account,
                        amount: formattedOutputs[Number(outpointIndex)].amount
                      }
                    }
                  } else if (type === 'onchain_fee' && txid === hash) {
                    fees.push(
                      credit_msat
                        ? formatMsatString(credit_msat)
                        : `-${formatMsatString(debit_msat)}`
                    )

                    return
                  }
                })
              }

              if (timestamp === null) {
                if (blockheight) {
                  timestamp = await getBlockTimestamp(blockheight)
                } else {
                  timestamp = nowSeconds()
                }
              }

              const payment: TransactionPayment = {
                id: hash,
                walletId: walletId,
                timestamp,
                network,
                status: typeof blockheight === 'number' ? 'complete' : 'pending',
                type: 'transaction',
                data: {
                  rawTx: rawtx,
                  blockHeight: blockheight,
                  txindex,
                  locktime,
                  version,
                  rbfEnabled,
                  inputs: formattedInputs,
                  outputs: formattedOutputs,
                  channel,
                  fee: fees.length
                    ? msatsToSats(
                        fees.reduce((total, msat) => {
                          return Big(total).plus(msat).toString()
                        }, '0')
                      )
                    : undefined
                }
              }

              return payment
            }
          )
        )

        self.postMessage({ id, result })

        return
      } catch (error) {
        self.postMessage({ id, error })
        return
      }
    }
    case 'get_channels': {
      const { id, walletId, rune, version, channel } = message.data
      let closedChannels: Channel[] = []

      try {
        const socket = sockets[message.data.socketId]
        const result = await socket.commando({ method: 'listclosedchannels', rune })

        closedChannels = await Promise.all(
          (result as { closedchannels: ClosedChannel[] }).closedchannels.map(
            async ({
              channel_id,
              opener,
              peer_id,
              funding_txid,
              funding_outnum,
              closer,
              close_cause,
              final_to_us_msat
            }) => {
              const listNodesResponse = peer_id
                ? ((await socket.commando({
                    method: 'listnodes',
                    rune,
                    params: { id: peer_id }
                  })) as ListNodesResponse)
                : null
              const peer = listNodesResponse
                ? (listNodesResponse.nodes[0] as NodeFullResponse)
                : null

              return {
                id: channel_id,
                walletId: walletId,
                opener,
                fundingTransactionId: funding_txid,
                fundingOutput: funding_outnum,
                peerId: peer_id,
                peerAlias: peer?.alias,
                peerConnected: false,
                status: 'closed',
                closer,
                closeCause: close_cause,
                finalToUs: msatsToSats(formatMsatString(final_to_us_msat)),
                balanceLocal: 0,
                balanceRemote: 0,
                reserveLocal: 0,
                reserveRemote: 0
              } as Channel
            }
          )
        )
      } catch (error) {
        // could not get closed channels
      }

      if (version < 2305) {
        const socket = sockets[message.data.socketId]
        const listPeersResult = await socket.commando({
          method: 'listpeers',
          params: channel?.peerId ? { id: channel.peerId } : undefined,
          rune
        })

        const { peers } = listPeersResult as ListPeersResponse

        const result = await Promise.all(
          peers
            .filter(({ channels }) => !!channels)
            .map(async ({ id, channels, connected }) => {
              const {
                nodes: [peer]
              } = (await socket.commando({
                method: 'listnodes',
                rune,
                params: { id }
              })) as ListNodesResponse

              return channels.map(channel => {
                const {
                  opener,
                  funding_txid,
                  funding_outnum,
                  channel_id,
                  short_channel_id,
                  state,
                  to_us_msat,
                  total_msat,
                  our_reserve_msat,
                  their_reserve_msat,
                  fee_base_msat,
                  fee_proportional_millionths,
                  close_to_addr,
                  close_to,
                  closer,
                  htlcs,
                  minimum_htlc_out_msat,
                  maximum_htlc_out_msat,
                  our_to_self_delay,
                  their_to_self_delay,
                  state_changes
                } = channel

                return {
                  walletId,
                  opener,
                  peerId: id,
                  peerConnected: connected,
                  peerAlias: (peer as NodeFullResponse)?.alias,
                  fundingTransactionId: funding_txid,
                  fundingOutput: funding_outnum,
                  id: channel_id,
                  shortId: short_channel_id,
                  status: stateToChannelStatus(state_changes?.length ? state_changes : state),
                  balanceLocal: msatsToSats(formatMsatString(to_us_msat)),
                  balanceRemote: msatsToSats(
                    Big(formatMsatString(total_msat)).minus(formatMsatString(to_us_msat)).toString()
                  ),
                  reserveRemote: msatsToSats(formatMsatString(our_reserve_msat || '0')),
                  reserveLocal: msatsToSats(formatMsatString(their_reserve_msat || '0')),
                  feeBase: msatsToSats(formatMsatString(fee_base_msat.toString())),
                  feePpm: fee_proportional_millionths,
                  closeToAddress: close_to_addr ?? null,
                  closeToScriptPubkey: close_to ?? null,
                  closer,
                  htlcMin: msatsToSats(formatMsatString(minimum_htlc_out_msat)),
                  htlcMax: msatsToSats(formatMsatString(maximum_htlc_out_msat)),
                  ourToSelfDelay: our_to_self_delay,
                  theirToSelfDelay: their_to_self_delay,
                  htlcs: htlcs.map(
                    ({ direction, id, amount_msat, expiry, payment_hash, state }) => ({
                      id,
                      direction,
                      amount: msatsToSats(formatMsatString(amount_msat)),
                      expiry,
                      paymentHash: payment_hash,
                      state
                    })
                  )
                } as Channel
              })
            })
        )

        const flattened = result.concat(closedChannels).flat()
        self.postMessage({
          id,
          result: channel?.id ? flattened.filter(({ id }) => id === channel.id) : flattened
        })
        return
      } else {
        const socket = sockets[message.data.socketId]
        const listPeerChannelsResult = await socket.commando({
          method: 'listpeerchannels',
          params: channel?.peerId ? { id: channel.peerId } : undefined,
          rune
        })

        const { channels } = listPeerChannelsResult as ListPeerChannelsResponse

        const formattedChannels = await Promise.all(
          channels.map(async chan => {
            const {
              peer_id,
              peer_connected,
              opener,
              funding_txid,
              funding_outnum,
              channel_id,
              short_channel_id,
              state,
              to_us_msat,
              total_msat,
              fee_base_msat,
              fee_proportional_millionths,
              close_to_addr,
              close_to,
              closer,
              our_reserve_msat,
              their_reserve_msat,
              htlcs,
              minimum_htlc_out_msat,
              maximum_htlc_out_msat,
              our_to_self_delay,
              their_to_self_delay,
              state_changes
            } = chan

            const {
              nodes: [peer]
            } = (await socket.commando({
              method: 'listnodes',
              rune,
              params: { id: peer_id }
            })) as ListNodesResponse

            return {
              walletId,
              opener,
              peerId: peer_id,
              peerConnected: peer_connected,
              peerAlias: (peer as NodeFullResponse)?.alias,
              fundingTransactionId: funding_txid,
              fundingOutput: funding_outnum,
              id: channel_id,
              shortId: short_channel_id,
              status: stateToChannelStatus(state_changes?.length ? state_changes : state),
              balanceLocal: msatsToSats(formatMsatString(to_us_msat)),
              balanceRemote: msatsToSats(
                Big(formatMsatString(total_msat)).minus(formatMsatString(to_us_msat)).toString()
              ),
              reserveRemote: msatsToSats(formatMsatString(our_reserve_msat)),
              reserveLocal: msatsToSats(formatMsatString(their_reserve_msat)),
              feeBase: msatsToSats(formatMsatString(fee_base_msat)),
              feePpm: fee_proportional_millionths,
              closeToAddress: close_to_addr,
              closeToScriptPubkey: close_to,
              closer: closer,
              htlcMin: msatsToSats(formatMsatString(minimum_htlc_out_msat)),
              htlcMax: msatsToSats(formatMsatString(maximum_htlc_out_msat)),
              ourToSelfDelay: our_to_self_delay,
              theirToSelfDelay: their_to_self_delay,
              htlcs: htlcs.map(({ direction, id, amount_msat, expiry, payment_hash, state }) => ({
                id,
                direction,
                amount: msatsToSats(formatMsatString(amount_msat)),
                expiry,
                paymentHash: payment_hash,
                state
              }))
            } as Channel
          })
        )

        const allChannels = formattedChannels.concat(closedChannels)

        self.postMessage({
          id,
          result: channel?.id ? allChannels.filter(({ id }) => id === channel.id) : allChannels
        })
        return
      }
    }
    case 'format_utxos': {
      const { id, walletId, outputs, accountEvents } = message.data

      const formatted = outputs.map(
        ({ txid, output, amount_msat, scriptpubkey, address, status, reserved, blockheight }) => {
          let timestamp: number | null = null
          let spendingTxid: string | undefined = undefined

          if (accountEvents) {
            const events = inPlaceSort(
              accountEvents.events.filter(event => {
                const { type, outpoint, account } = event as ChainEvent
                return account === 'wallet' && type === 'chain' && outpoint === `${txid}:${output}`
              })
            ).desc(({ timestamp }) => timestamp)

            const [lastEvent] = events as ChainEvent[]

            if (lastEvent) {
              timestamp = lastEvent.timestamp || null

              if (lastEvent.tag === 'withdrawal') {
                spendingTxid = lastEvent.txid
              }
            }
          }

          const utxo: Utxo = {
            id: `${txid}:${output}`,
            txid: txid,
            output,
            spendingTxid,
            amount: msatsToSats(formatMsatString(amount_msat)),
            scriptpubkey,
            address,
            status: reserved ? 'spent_unconfirmed' : status,
            blockHeight: blockheight,
            walletId,
            timestamp
          }

          return utxo
        }
      )

      self.postMessage({ id, result: formatted })

      return
    }
    default: {
      throw new Error('Unknown message type')
    }
  }
}

export {}
