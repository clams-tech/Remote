import LnMessage from 'lnmessage'
import type { CommandoRequest, LnWebSocketOptions } from 'lnmessage/dist/types.js'
import type { Invoice } from '$lib/@types/invoices.js'
import { formatInvoice, formatMsatString, payToInvoice, stateToChannelStatus } from './utils.js'
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
import type { Channel } from '$lib/@types/channels.js'
import { inPlaceSort } from 'fast-sort'
import type { Utxo } from '$lib/@types/utxos.js'

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
  ToThemEvent,
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

type GetChannelsMessage = MessageBase & {
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

let socket: LnMessage

onmessage = async (message: MessageEvent<Message>) => {
  switch (message.data.type) {
    case 'init': {
      socket = new LnMessage(message.data.data)
      socket.connectionStatus$.subscribe(status => {
        console.log('CONNECTION STATUS UPDATE:', status)
        self.postMessage({ id: 'connectionStatus$', result: status })
      })

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
    case 'get_channels': {
      const { id, walletId, rune, version, channel } = message.data
      let closedChannels: Channel[] = []

      try {
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

          return {
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
          } as Utxo
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
