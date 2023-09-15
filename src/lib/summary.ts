import type { Invoice } from '$lib/@types/invoices.js'
import type { Transaction } from '$lib/@types/transactions.js'
import { db } from '$lib/db.js'
import { connections$ } from '$lib/streams.js'
import { filter, firstValueFrom, map } from 'rxjs'
import type { Channel } from './@types/channels.js'
import type { Deposit } from './@types/deposits.js'
import type { Utxo } from './@types/utxos.js'
import type { Wallet } from './@types/wallets.js'
import type { Withdrawal } from './@types/withdrawals.js'
import { truncateValue } from './utils.js'
import Dexie from 'dexie'
import { bolt12ToOffer, isBolt12Invoice } from './invoices.js'
import type { Address } from './@types/addresses.js'

export type ChannelPaymentSummary = {
  timestamp: number
  primary?: string
  secondary?: string
  amount?: number
  type: 'channel_open' | 'channel_close' | 'channel_force_close' | 'channel_mutiple_open'
  category: 'expense' | 'neutral'
  fee: number
}

/** a summary of any funds movement designed to be rendered as human readable sentences:
 * Bob withdrew 500 sats from Exchange
 * Bob deposited 21000 sats to Stacker News
 * Alice transferred 2100 sats to Bob
 * Carol closed a channel with Bob
 */
export type TransactionSummary = {
  /** the timestamp (unix seconds) of when movement completed or started */
  timestamp: number
  /** the amount. depends on type as to what the amount is*/
  amount: number
  fee: number
  /** usually one of our wallets */
  primary?: string
  /** usually a counterparty */
  secondary?: string
  type: 'send' | 'receive' | 'transfer' | 'withdrawal' | 'deposit' | 'sweep'
  category: 'expense' | 'income' | 'neutral'
}

export type PaymentSummary = ChannelPaymentSummary | TransactionSummary

export type EnhancedInput = {
  /** wallet.id, channel.id, withdrawal.id, outpoint */
  id: string
  category: 'spend' | 'withdrawal' | 'channel_close' | 'unknown' | 'timelocked'
  utxo?: Utxo
}

export type EnhancedOutput = {
  /** wallet.id, channel.id, deposit.id, address */
  id: string
  category:
    | 'timelocked'
    | 'receive'
    | 'settle'
    | 'transfer'
    | 'change'
    | 'deposit'
    | 'send'
    | 'channel_open'
    | 'sweep'
    | 'unknown'
  /** output sats */
  amount: number
  address: string
  utxo?: Utxo
}

const isChangeOutput = (inputs: EnhancedInput[], utxo: Utxo): boolean =>
  !!inputs.find((input) => input.utxo?.walletId === utxo.walletId)

const isTransferOutput = (inputs: EnhancedInput[], utxo: Utxo): boolean =>
  !!inputs.find((input) => input.utxo && input.utxo.walletId !== utxo.walletId)

const isSweepOutput = async (inputs: Transaction['inputs']): Promise<string | undefined> => {
  /**
   * if transaction is a receive (don't know the input utxo)
   * lookup all transactions that have transaction.channel.type === 'force_close'
   * check the outputs of force closed transactions to see if any of them are an input to this transaction
   * if there is, then this is a sweep transaction from the force close
   */

  const forceClosedTransactions = await db.transactions
    .where('channel.type')
    .equals('force_close')
    .toArray()

  let channelId: string | undefined

  forceClosedTransactions.forEach(({ outputs, id, channel }) => {
    outputs.forEach(({ index }) => {
      const forceCloseOutputOutpoint = `${id}:${index}`
      inputs.forEach((input) => {
        const inputOutpoint = `${input.txid}:${input.index}`
        if (inputOutpoint === forceCloseOutputOutpoint) {
          channelId = channel?.id
        }
      })
    })
  })

  return channelId
}

export const enhanceInputsOutputs = async (
  transaction: Transaction
): Promise<{
  inputs: EnhancedInput[]
  outputs: EnhancedOutput[]
}> => {
  const inputs: EnhancedInput[] = await Promise.all(
    transaction.inputs.map(async (input) => {
      /** Possibilities:
       * we own the input (spend)
       * the input was a channel 2of2 multisig (closing channel tx)(channel)
       * the input was owned by a custodian and we withdrew to self custody (requires looking at outputs address to match with withdrawal destination)(withdrawal)
       * we don't know about this input (return outpoint))(unknown)
       */

      const { txid, index } = input
      const ownedInputUtxo = await db.utxos.get(`${txid}:${index}`)

      const closedChannel = await db.channels
        .where({ fundingTransactionId: txid, fundingOutput: index })
        .first()

      const withdrawal = await db.withdrawals
        .where('destination')
        .anyOf(transaction.outputs.map(({ address }) => address))
        .first()

      const enhanced: EnhancedInput = closedChannel
        ? {
            category: 'channel_close',
            id: closedChannel.id
          }
        : withdrawal
        ? { category: 'withdrawal', id: withdrawal.id }
        : ownedInputUtxo
        ? {
            category: 'spend',
            id: ownedInputUtxo.walletId,
            utxo: ownedInputUtxo
          }
        : { category: 'unknown', id: `${txid}:${index}` }

      return enhanced
    })
  )

  const outputs: EnhancedOutput[] = await Promise.all(
    transaction.outputs.map(async (output) => {
      /** Possibilities:
       * we own the output (receive)
       * we own the output and we own an input from the same wallet (change) (requires looking at inputs)
       * we own the output and we own an input but not from the same wallet (transfer) (requires looking at inputs)
       * the output was to a channel 2of2 multisig (opening channel tx)(channelOpen)
       * the output was to a close to address for a channel close(channelClose)
       * the output address matches with a deposit to a custodian (deposit)
       * we don't know about this output (return address)(unknown)
       */
      const { address, index, amount } = output
      const ownedOutputUtxo = await db.utxos.get(`${transaction.id}:${index}`)
      const closedChannelId =
        inputs.find(({ category }) => category === 'channel_close')?.id || null
      const ownAtLeastOneInputUtxo = inputs.find(({ utxo }) => !!utxo)

      const openedChannel = await db.channels
        .where({ fundingTransactionId: transaction.id, fundingOutput: index })
        .first()

      const deposit = await db.deposits.where({ destination: address }).first()
      const sweptFromChannelId = await isSweepOutput(transaction.inputs)

      if (sweptFromChannelId) {
        inputs.forEach((input) => {
          input.category = 'timelocked'
        })
      }

      const closedChannel = closedChannelId
        ? ((await db.channels.get(closedChannelId)) as Channel)
        : null

      const enhanced: EnhancedOutput = closedChannelId
        ? ownedOutputUtxo
          ? { category: 'settle', id: closedChannelId, amount, utxo: ownedOutputUtxo, address }
          : closedChannel?.finalToUs && Math.floor(closedChannel?.finalToUs) === amount
          ? { category: 'timelocked', id: closedChannel.walletId, amount, address }
          : { category: 'settle', id: closedChannelId, amount, address }
        : openedChannel
        ? { category: 'channel_open', id: openedChannel.id, amount, address }
        : ownedOutputUtxo
        ? {
            category: isChangeOutput(inputs, ownedOutputUtxo)
              ? 'change'
              : isTransferOutput(inputs, ownedOutputUtxo)
              ? 'transfer'
              : sweptFromChannelId
              ? 'sweep'
              : 'receive',
            id: sweptFromChannelId || ownedOutputUtxo.walletId,
            utxo: ownedOutputUtxo,
            amount,
            address
          }
        : deposit
        ? { category: 'deposit', id: deposit.id, amount, address }
        : ownAtLeastOneInputUtxo
        ? { category: 'send', id: address, amount, address }
        : { category: 'unknown', id: address, amount, address }

      return enhanced
    })
  )

  return { inputs, outputs }
}

const deriveChannelCapacity = (channel: Channel): number =>
  channel.balanceLocal + channel.balanceRemote

export const deriveTransactionSummary = ({
  inputs,
  outputs,
  fee,
  timestamp,
  channel: transactionChannel
}: {
  inputs: EnhancedInput[]
  outputs: EnhancedOutput[]
  fee: Transaction['fee']
  timestamp: Transaction['timestamp']
  channel: Transaction['channel']
}): Promise<PaymentSummary> => {
  return db.transaction(
    'r',
    db.channels,
    db.wallets,
    db.withdrawals,
    db.deposits,
    db.metadata,
    // eslint-disable-next-line
    // @ts-ignore
    db.contacts,
    async () => {
      const channelClose = inputs.find(({ category }) => category === 'channel_close')
      const channelOpens = outputs.filter(({ category }) => category === 'channel_open')

      if (channelClose) {
        const channel = (await db.channels.get(channelClose.id)) as Channel
        const channelWallet = (await db.wallets.get(channel.walletId)) as Wallet

        return {
          timestamp,
          fee: fee || 0,
          category: fee ? 'expense' : 'neutral',
          type:
            transactionChannel?.type === 'force_close' ? 'channel_force_close' : 'channel_close',
          primary:
            channel.closer === 'local' ? channelWallet.label : channel.peerAlias || channel.peerId,
          secondary:
            channel.closer === 'local' ? channel.peerAlias || channel.peerId : channelWallet.label
        }
      }

      if (channelOpens.length) {
        const channels = (await Promise.all(
          channelOpens.map((channelOpen) => db.channels.get(channelOpen.id))
        )) as Channel[]

        const channelWallet = await db.wallets.get(channels[0].walletId)

        const weOpened = channels[0].opener === channelWallet?.nodeId

        return {
          timestamp,
          fee: fee || 0,
          category: fee ? 'expense' : 'neutral',
          type: channels.length > 1 ? 'channel_mutiple_open' : 'channel_open',
          amount: channels.reduce((total, channel) => total + deriveChannelCapacity(channel), 0),
          primary: weOpened ? channelWallet?.label : channels[0].peerAlias || channels[0].peerId,
          secondary: weOpened
            ? channels.map((channel) => channel.peerAlias || channel.peerId).join(', ')
            : channelWallet?.label
        }
      }

      const withdrawal = inputs.find(({ category }) => category === 'withdrawal')

      if (withdrawal) {
        const withdrawalDetails = (await db.withdrawals.get(withdrawal.id)) as Withdrawal
        const withdrawalWallet = (await db.wallets.get(withdrawalDetails.walletId)) as Wallet

        const withdrawalUtxo = outputs.find(
          ({ utxo }) => utxo?.address === withdrawalDetails.destination
        )?.utxo as Utxo

        const destinationWallet = (await db.wallets.get(withdrawalUtxo.walletId)) as Wallet

        return {
          timestamp,
          fee: fee || 0,
          category: 'expense',
          type: 'withdrawal',
          amount: withdrawalUtxo.amount,
          secondary: withdrawalWallet.label,
          primary: destinationWallet.label
        }
      }

      const deposit = outputs.find(({ category }) => category === 'deposit')

      if (deposit) {
        const depositDetails = (await db.deposits.get(deposit.id)) as Deposit
        const depositWallet = (await db.wallets.get(depositDetails.walletId)) as Wallet
        const sourceUtxo = inputs.find(({ utxo }) => !utxo)?.utxo as Utxo
        const sourceWallet = (await db.wallets.get(sourceUtxo.walletId)) as Wallet

        return {
          timestamp,
          fee: fee || 0,
          category: 'expense',
          type: 'deposit',
          amount: depositDetails.amount,
          primary: sourceWallet.label,
          secondary: depositWallet.label
        }
      }

      const transfer = outputs.find(({ category }) => category === 'transfer')

      if (transfer) {
        const sourceInput = inputs.find(
          ({ utxo }) => utxo?.walletId !== transfer.utxo?.walletId
        ) as EnhancedInput

        const sourceWallet = (await db.wallets.get(sourceInput.utxo?.walletId)) as Wallet
        const destinationWallet = (await db.wallets.get(transfer.utxo?.walletId)) as Wallet

        return {
          timestamp,
          fee: fee || 0,
          category: 'expense',
          type: 'transfer',
          amount: transfer.amount,
          primary: sourceWallet.label,
          secondary: destinationWallet.label
        }
      }

      const send = outputs.find(({ category }) => category === 'send')

      if (send) {
        const sourceInput = inputs.find(({ utxo }) => !!utxo) as EnhancedInput
        const sourceWallet = (await db.wallets.get(sourceInput.utxo?.walletId)) as Wallet
        const destinationAddress = send.id
        const destinationMetadata = await db.metadata.get(destinationAddress)
        const destinationContact = destinationMetadata?.contact
          ? await db.contacts.get(destinationMetadata.contact)
          : null

        return {
          timestamp,
          fee: fee || 0,
          category: 'expense',
          type: 'send',
          amount: send.amount,
          primary: sourceWallet.label,
          secondary: destinationContact?.name || truncateValue(destinationAddress)
        }
      }

      const sweep = outputs.find(({ category }) => category === 'sweep')

      if (sweep) {
        const wallet = (await db.wallets.get(sweep.utxo?.walletId)) as Wallet
        const sweptChannel = (await db.channels.get(sweep.id)) as Channel

        return {
          timestamp,
          fee: fee || 0,
          category: 'expense',
          type: 'sweep',
          amount: sweep.amount,
          primary: wallet.label,
          secondary:
            sweptChannel.peerAlias ||
            (sweptChannel.peerId ? truncateValue(sweptChannel.peerId) : undefined)
        }
      }

      const receive = outputs.find(({ category }) => category === 'receive') as EnhancedOutput
      const receiveWallet = (await db.wallets.get(receive.utxo?.walletId)) as Wallet
      const sourceAddress = receive.utxo?.address as string
      const sourceMetadata = await db.metadata.get(sourceAddress)

      const sourceContact = sourceMetadata?.contact
        ? await db.contacts.get(sourceMetadata.contact)
        : null

      return {
        timestamp,
        fee: 0,
        category: 'income',
        type: 'receive',
        amount: receive.amount,
        secondary: sourceContact?.name || truncateValue(sourceAddress),
        primary: receiveWallet.label
      }
    }
  )
}

export const deriveInvoiceSummary = ({
  direction,
  amount,
  fee,
  nodeId,
  request,
  walletId,
  createdAt,
  completedAt
}: Invoice): Promise<PaymentSummary> => {
  return db.transaction('r', db.wallets, db.contacts, db.metadata, async () => {
    let transferWallet: Wallet | undefined

    const wallet = (await db.wallets.get(walletId)) as Wallet

    const lightningConnections = await Dexie.waitFor(
      firstValueFrom(
        connections$.pipe(
          filter((connections) => !!connections.length),
          map((connections) => connections.filter((connection) => !!connection.invoices?.create))
        )
      )
    )

    const lightningWallets = await db.wallets
      .where('id')
      .anyOf(lightningConnections.map(({ walletId }) => walletId))
      .and((wallet) => !!wallet.nodeId)
      .toArray()

    if (request && isBolt12Invoice(request)) {
      const offerDetails = await Dexie.waitFor(bolt12ToOffer(request, walletId))

      transferWallet = lightningWallets.find(
        (wallet) => wallet.nodeId === (offerDetails.sendNodeId || offerDetails.receiveNodeId)
      )
    } else if (direction === 'send') {
      transferWallet = lightningWallets.find((wallet) => wallet.nodeId === nodeId)
    }

    const nodeIdMetadata = await db.metadata.get(nodeId)

    const nodeIdContact = nodeIdMetadata?.contact
      ? await db.contacts.get(nodeIdMetadata.contact)
      : null

    const requestMetadata = request && (await db.metadata.get(request))

    const requestContact =
      requestMetadata && requestMetadata.contact
        ? await db.contacts.get(requestMetadata.contact)
        : null

    const counterparty =
      requestContact?.name ||
      nodeIdContact?.name ||
      (request ? truncateValue(request) : truncateValue(nodeId))

    return {
      timestamp: completedAt || createdAt,
      fee: fee || 0,
      category: direction === 'receive' ? 'income' : 'expense',
      type: transferWallet ? 'transfer' : direction,
      amount,
      primary: transferWallet && direction === 'receive' ? transferWallet.label : wallet.label,
      secondary: transferWallet
        ? direction === 'receive'
          ? wallet.label
          : transferWallet.label
        : counterparty
    }
  })
}

export const deriveAddressSummary = async ({
  createdAt,
  amount,
  walletId
}: Address): Promise<PaymentSummary> => {
  const wallet = (await db.wallets.get(walletId)) as Wallet

  return {
    timestamp: createdAt,
    fee: 0,
    category: 'income',
    type: 'receive',
    amount,
    primary: wallet.label,
    secondary: undefined
  }
}
