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
import { get } from 'svelte/store'
import { translate } from './i18n/translations.js'
import type { Contact } from './@types/contacts.js'

export type CounterPart =
  | { type: 'wallet'; value: Wallet }
  | { type: 'channel_peer'; value: Channel['peerAlias'] | Channel['peerId'] }
  | { type: 'contact'; value: Contact }
  | { type: 'unknown'; value: string }

export type ChannelTransactionSummary = {
  timestamp: number
  primary: CounterPart
  secondary: CounterPart
  channel: Channel
  type: 'channel_open' | 'channel_close' | 'channel_force_close' | 'channel_mutiple_open'
  category: 'expense' | 'neutral'
  fee: number
}

export type RegularTransactionSummary = {
  timestamp: number
  amount: number
  fee: number
  primary: CounterPart
  secondary: CounterPart
  type: 'send' | 'receive' | 'transfer' | 'withdrawal' | 'deposit' | 'sweep'
  category: 'expense' | 'income' | 'neutral'
  inputs: EnhancedInput[]
  outputs: EnhancedOutput[]
}

export type TransactionSummary = ChannelTransactionSummary | RegularTransactionSummary

export type ChannelCloseInput = {
  outpoint: string
  type: 'channel_close'
  channel: Channel
}

export type WithdrawalInput = {
  outpoint: string
  type: 'withdrawal'
  withdrawal: Withdrawal
}

export type SpendInput = {
  outpoint: string
  type: 'spend'
  utxo: Utxo
}

export type EnhancedInput =
  | ChannelCloseInput
  | WithdrawalInput
  | SpendInput
  | {
      outpoint: string
      type: 'unknown' | 'timelocked'
    }

export type OutputCommon = {
  outpoint: string
  amount: number
  address: string
}

export type UtxoOutput = OutputCommon & {
  type: 'receive' | 'change' | 'settle' | 'sweep' | 'timelocked'
  utxo: Utxo
}

export type ChannelOpenOutput = OutputCommon & {
  type: 'channel_open'
  channel: Channel
}

export type DepositOutput = OutputCommon & {
  type: 'deposit'
  deposit: Deposit
}

export type TransferOutput = OutputCommon & {
  type: 'transfer'
  wallet: Wallet
}

export type UnknownOutput = OutputCommon & {
  type: 'send' | 'unknown'
}

export type EnhancedOutput =
  | UtxoOutput
  | ChannelOpenOutput
  | DepositOutput
  | TransferOutput
  | UnknownOutput

const isChangeOutput = (inputs: EnhancedInput[], utxo: Utxo): boolean =>
  !!inputs.find((input) => input.type === 'spend' && input.utxo.walletId === utxo.walletId)

const isTransferOutput = (inputs: EnhancedInput[], utxo: Utxo): boolean =>
  !!inputs.find((input) => input.type === 'spend' && input.utxo.walletId !== utxo.walletId)

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

  let forceClosedChannelId: Channel['id'] | undefined

  forceClosedTransactions.forEach(({ outputs, id, channel }) => {
    outputs.forEach(({ index }) => {
      const forceCloseOutputOutpoint = `${id}:${index}`
      inputs.forEach((input) => {
        const inputOutpoint = `${input.txid}:${input.index}`
        if (inputOutpoint === forceCloseOutputOutpoint) {
          forceClosedChannelId = channel?.id
        }
      })
    })
  })

  return forceClosedChannelId
}

const deriveChannelCapacity = (channel: Channel): number =>
  channel.balanceLocal + channel.balanceRemote

export const deriveTransactionSummary = ({
  id,
  inputs,
  outputs,
  fee,
  timestamp,
  channel: transactionChannel
}: Transaction): Promise<TransactionSummary> => {
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
    db.utxos,
    async () => {
      const enhancedInputs: EnhancedInput[] = await Promise.all(
        inputs.map(async (input) => {
          /** Possibilities:
           * we own the input (spend)
           * the input was a channel 2of2 multisig (closing channel tx)(channel)
           * the input was owned by a custodian and we withdrew to self custody (requires looking at outputs address to match with withdrawal destination)(withdrawal)
           * we don't know about this input (return outpoint))(unknown)
           */

          const { txid, index } = input
          const ownedInputUtxo = await db.utxos.get(`${txid}:${index}`)
          const outpoint = `${txid}:${index}`

          const closedChannel = await db.channels
            .where({ fundingTransactionId: txid, fundingOutput: index })
            .first()

          const withdrawal = await db.withdrawals
            .where('destination')
            .anyOf(outputs.map(({ address }) => address))
            .first()

          const enhanced: EnhancedInput = closedChannel
            ? {
                outpoint,
                type: 'channel_close',
                channel: closedChannel
              }
            : withdrawal
            ? { outpoint, type: 'withdrawal', withdrawal }
            : ownedInputUtxo
            ? {
                type: 'spend',
                outpoint,
                utxo: ownedInputUtxo
              }
            : { type: 'unknown', outpoint }

          return enhanced
        })
      )

      const enhancedOutputs: EnhancedOutput[] = await Promise.all(
        outputs.map(async (output) => {
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
          const outpoint = `${id}:${index}`
          const ownedOutputUtxo = await db.utxos.get(outpoint)

          const closedChannel = (
            enhancedInputs.find(({ type }) => type === 'channel_close') as ChannelCloseInput
          )?.channel

          const ownedInputUtxo = enhancedInputs.find((input) => input.type === 'spend')

          const openedChannel = await db.channels
            .where({ fundingTransactionId: id, fundingOutput: index })
            .first()

          const deposit = await db.deposits.where({ destination: address }).first()
          const sweptFromChannelId = await isSweepOutput(inputs)
          const sweptChannel = sweptFromChannelId
            ? await db.channels.get(sweptFromChannelId)
            : undefined

          if (sweptFromChannelId) {
            enhancedInputs.forEach((input) => {
              input.type = 'timelocked'
            })
          }

          const enhanced: EnhancedOutput = closedChannel
            ? ownedOutputUtxo
              ? {
                  type: 'settle',
                  channel: closedChannel,
                  amount,
                  utxo: ownedOutputUtxo,
                  address,
                  outpoint
                }
              : closedChannel?.finalToUs && Math.floor(closedChannel?.finalToUs) === amount
              ? { type: 'timelocked', channel: closedChannel, amount, address, outpoint }
              : { type: 'settle', channel: closedChannel, amount, address, outpoint }
            : openedChannel
            ? { type: 'channel_open', channel: openedChannel, amount, address, outpoint }
            : ownedOutputUtxo
            ? {
                type: isChangeOutput(enhancedInputs, ownedOutputUtxo)
                  ? 'change'
                  : isTransferOutput(enhancedInputs, ownedOutputUtxo)
                  ? 'transfer'
                  : sweptFromChannelId
                  ? 'sweep'
                  : 'receive',
                channel: sweptChannel,
                utxo: ownedOutputUtxo,
                amount,
                address,
                outpoint
              }
            : deposit
            ? { type: 'deposit', deposit, amount, address, outpoint }
            : ownedInputUtxo
            ? { type: 'send', amount, address, outpoint }
            : { type: 'unknown', amount, address, outpoint }

          return enhanced
        })
      )

      const channelClose = enhancedInputs.find(({ type }) => type === 'channel_close') as
        | ChannelCloseInput
        | undefined
      const channelOpens = enhancedOutputs.filter(({ type }) => type === 'channel_open')

      if (channelClose) {
        const { channel } = channelClose
        const channelWallet = (await db.wallets.get(channel.walletId)) as Wallet
        const channelPartnerWallet =
          channel.peerId && (await db.wallets.where({ nodeId: channel.peerId }).first())

        return {
          timestamp,
          primary:
            channel.closer === 'local'
              ? { type: 'wallet', value: channelWallet }
              : { type: 'channelPar' },
          secondary:
            channel.closer === 'local'
              ? channelPartnerWallet
                ? { type: 'wallet', value: channelPartnerWallet }
                : { type: 'channel_peer', value: channel?.peerAlias || channel?.peerId }
              : { type: 'wallet', value: channelWallet },
          fee: fee || 0,
          category: fee ? 'expense' : 'neutral',
          type: transactionChannel?.type === 'force_close' ? 'channel_force_close' : 'channel_close'
        }
      }

      if (channelOpens.length) {
        const channelWallet = await db.wallets.get(channelOpens[0].channel.walletId)

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
        primary: receiveWallet.label,
        secondary: sourceContact?.name || get(translate)('app.labels.unknown')
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
