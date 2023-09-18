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
import Dexie from 'dexie'
import { bolt12ToOffer, isBolt12Invoice } from './invoices.js'
import type { Address } from './@types/addresses.js'
import type { Contact } from './@types/contacts.js'

export type CounterPart =
  | { type: 'wallet'; value: Wallet }
  | { type: 'channel_peer'; value: Channel['peerAlias'] | Channel['peerId'] }
  | { type: 'contact'; value: Contact }
  | { type: 'unknown'; value: string }

export type SummaryCommon = {
  timestamp: number
  primary: CounterPart
  secondary: CounterPart
  category: 'expense' | 'income' | 'neutral'
  fee: number
}

export type ChannelTransactionSummary = SummaryCommon & {
  type: 'channel_open' | 'channel_close' | 'channel_force_close' | 'channel_mutiple_open'
  channels: Channel[]
  inputs: EnhancedInput[]
  outputs: EnhancedOutput[]
}

export type RegularTransactionSummary = SummaryCommon & {
  type: 'send' | 'receive' | 'transfer' | 'withdrawal' | 'deposit' | 'sweep'
  inputs: EnhancedInput[]
  outputs: EnhancedOutput[]
  amount: number
}

export type TransactionSummary = ChannelTransactionSummary | RegularTransactionSummary

export type InvoiceSummary = SummaryCommon & {
  type: 'receive' | 'send' | 'transfer'
  amount: number
}

export type AddressSummary = SummaryCommon & {
  type: 'receive'
  amount: number
}

export type PaymentSummary = TransactionSummary | InvoiceSummary | AddressSummary

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

export type TimelockedInput = {
  outpoint: string
  type: 'timelocked'
  channel: Channel
}

export type EnhancedInput =
  | ChannelCloseInput
  | WithdrawalInput
  | SpendInput
  | TimelockedInput
  | {
      outpoint: string
      type: 'unknown'
    }

export type OutputCommon = {
  outpoint: string
  amount: number
  address: string
}

export type UtxoOutput = OutputCommon & {
  type: 'receive' | 'change' | 'transfer'
  utxo: Utxo
}

export type SweepOutput = OutputCommon & {
  type: 'sweep'
  utxo: Utxo
  channel: Channel
}

export type TimelockedForcCloseOutput = OutputCommon & {
  type: 'timelocked'
  channel: Channel
}

export type SettledChannelOutput = OutputCommon & {
  type: 'settle'
  channel: Channel
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

export type UnknownOutput = OutputCommon & {
  type: 'send' | 'unknown'
}

export type EnhancedOutput =
  | UtxoOutput
  | ChannelOpenOutput
  | SettledChannelOutput
  | TimelockedForcCloseOutput
  | DepositOutput
  | SweepOutput
  | UnknownOutput

const isChangeOutput = (inputs: EnhancedInput[], utxo: Utxo): boolean =>
  !!inputs.find((input) => input.type === 'spend' && input.utxo.walletId === utxo.walletId)

const isTransferOutput = (inputs: EnhancedInput[], utxo: Utxo): boolean =>
  !!inputs.find((input) => input.type === 'spend' && input.utxo.walletId !== utxo.walletId)

const isSweepOutput = async (
  inputs: Transaction['inputs']
): Promise<{ forceClosedChannelId: string | undefined; outpoint: string | undefined }> => {
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
  let outpoint: string | undefined

  forceClosedTransactions.forEach(({ outputs, id, channel }) => {
    outputs.forEach(({ index }) => {
      const forceCloseOutputOutpoint = `${id}:${index}`
      inputs.forEach((input) => {
        const inputOutpoint = `${input.txid}:${input.index}`
        if (inputOutpoint === forceCloseOutputOutpoint) {
          forceClosedChannelId = channel?.id
          outpoint = inputOutpoint
        }
      })
    })
  })

  return { forceClosedChannelId, outpoint }
}

export const deriveTransactionSummary = ({
  id,
  inputs,
  outputs,
  fee,
  timestamp,
  channel: transactionChannel,
  walletId
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
    db.transactions,
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
          const outpoint = `${txid}:${index}`

          const closedChannel = await db.channels
            .where({ fundingTransactionId: txid, fundingOutput: index })
            .first()

          if (closedChannel) {
            return {
              outpoint,
              type: 'channel_close',
              channel: closedChannel
            }
          }

          const withdrawal = await db.withdrawals
            .where('destination')
            .anyOf(outputs.map(({ address }) => address))
            .first()

          if (withdrawal) {
            return { outpoint, type: 'withdrawal', withdrawal }
          }

          const ownedInputUtxo = await db.utxos.get(outpoint)

          if (ownedInputUtxo) {
            return {
              type: 'spend',
              outpoint,
              utxo: ownedInputUtxo
            }
          }

          return { type: 'unknown', outpoint }
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

          if (closedChannel) {
            if (ownedOutputUtxo) {
              return {
                type: 'settle',
                channel: closedChannel,
                amount,
                utxo: ownedOutputUtxo,
                address,
                outpoint
              }
            } else if (
              (closedChannel.finalToUs && Math.floor(closedChannel.finalToUs) === amount) ||
              closedChannel.balanceLocal - (fee || 0) === amount
            ) {
              return { type: 'timelocked', channel: closedChannel, amount, address, outpoint }
            }
          }

          const openedChannel = await db.channels
            .where({ fundingTransactionId: id, fundingOutput: index })
            .first()

          if (openedChannel) {
            return { type: 'channel_open', channel: openedChannel, amount, address, outpoint }
          }

          const { forceClosedChannelId, outpoint: inputOutpoint } = await isSweepOutput(inputs)

          const sweptChannel = forceClosedChannelId
            ? await db.channels.get(forceClosedChannelId)
            : undefined

          if (forceClosedChannelId) {
            enhancedInputs.forEach((input) => {
              if (input.outpoint === inputOutpoint) {
                input.type = 'timelocked'
                ;(input as ChannelCloseInput).channel = sweptChannel as Channel
              }
            })
          }

          if (ownedOutputUtxo) {
            if (isChangeOutput(enhancedInputs, ownedOutputUtxo)) {
              return { type: 'change', utxo: ownedOutputUtxo, amount, address, outpoint }
            } else if (isTransferOutput(enhancedInputs, ownedOutputUtxo)) {
              return { type: 'transfer', utxo: ownedOutputUtxo, amount, address, outpoint }
            } else if (sweptChannel) {
              return {
                type: 'sweep',
                utxo: ownedOutputUtxo,
                channel: sweptChannel,
                amount,
                address,
                outpoint
              }
            } else {
              return { type: 'receive', utxo: ownedOutputUtxo, amount, address, outpoint }
            }
          }

          const deposit = await db.deposits.where({ destination: address }).first()

          if (deposit) {
            return { type: 'deposit', deposit, amount, address, outpoint }
          }

          if (ownedInputUtxo) {
            return { type: 'send', amount, address, outpoint }
          }

          return { type: 'unknown', amount, address, outpoint }
        })
      )

      const channelClose = enhancedInputs.find(({ type }) => type === 'channel_close') as
        | ChannelCloseInput
        | undefined

      const channelOpens = enhancedOutputs.filter(
        ({ type }) => type === 'channel_open'
      ) as ChannelOpenOutput[]

      if (channelClose) {
        const { channel } = channelClose
        const channelWallet = (await db.wallets.get(channel.walletId)) as Wallet

        const channelPartnerWallet =
          channel.peerId && (await db.wallets.where({ nodeId: channel.peerId }).first())

        const channelCloseSummary: ChannelTransactionSummary = {
          timestamp,
          primary:
            channel.closer === 'local'
              ? { type: 'wallet', value: channelWallet }
              : { type: 'channel_peer', value: channel.peerAlias || channel.peerId },
          secondary:
            channel.closer === 'local'
              ? channelPartnerWallet
                ? { type: 'wallet', value: channelPartnerWallet }
                : { type: 'channel_peer', value: channel?.peerAlias || channel?.peerId }
              : { type: 'wallet', value: channelWallet },
          channels: [channel],
          fee: fee || 0,
          inputs: enhancedInputs,
          outputs: enhancedOutputs,
          category:
            (channel.closer === 'local' || channelPartnerWallet) && fee ? 'expense' : 'neutral',
          type: transactionChannel?.type === 'force_close' ? 'channel_force_close' : 'channel_close'
        }

        return channelCloseSummary
      }

      if (channelOpens.length) {
        const [firstChannelOpen] = channelOpens
        const channels = channelOpens.map(({ channel }) => channel)
        const channelWallet = (await db.wallets.get(firstChannelOpen.channel.walletId)) as Wallet
        const weOpened = firstChannelOpen.channel.opener === 'local'

        const channelPartnerWallet =
          channels[0].peerId && (await db.wallets.where({ nodeId: channels[0].peerId }).first())

        let primary: CounterPart
        let secondary: CounterPart
        let counterparty: CounterPart

        if (channels.length > 1) {
          counterparty = {
            type: 'channel_peer',
            value: channels.map((channel) => channel.peerAlias || channel.peerId).join(', ')
          }
        } else if (channelPartnerWallet) {
          counterparty = { type: 'wallet', value: channelPartnerWallet }
        } else {
          counterparty = {
            type: 'channel_peer',
            value: firstChannelOpen.channel.peerAlias || firstChannelOpen.channel.peerId
          }
        }

        if (weOpened) {
          primary = { type: 'wallet', value: channelWallet }
          secondary = counterparty
        } else {
          primary = counterparty
          secondary = { type: 'wallet', value: channelWallet }
        }

        const channelOpenSummary: ChannelTransactionSummary = {
          timestamp,
          fee: fee || 0,
          category: weOpened && fee ? 'expense' : 'neutral',
          type: channelOpens.length > 1 ? 'channel_mutiple_open' : 'channel_open',
          channels,
          primary,
          secondary,
          inputs: enhancedInputs,
          outputs: enhancedOutputs
        }

        return channelOpenSummary
      }

      // must be an unknown channel open or close. Could be because we don't have access to list closed channels
      if (transactionChannel) {
        const { type } = transactionChannel
        const transactionWallet = (await db.wallets.get(walletId)) as Wallet

        const unknownChannelSummary: ChannelTransactionSummary = {
          timestamp,
          fee: fee || 0,
          category: fee ? 'expense' : 'neutral',
          type:
            type === 'force_close'
              ? 'channel_force_close'
              : type === 'close'
              ? 'channel_close'
              : 'channel_open',
          channels: [],
          primary: { type: 'wallet', value: transactionWallet },
          secondary: { type: 'channel_peer', value: undefined },
          inputs: enhancedInputs,
          outputs: enhancedOutputs
        }

        return unknownChannelSummary
      }

      const withdrawalInput = enhancedInputs.find(({ type }) => type === 'withdrawal') as
        | WithdrawalInput
        | undefined

      if (withdrawalInput) {
        const { withdrawal } = withdrawalInput
        const withdrawalWallet = (await db.wallets.get(withdrawal.walletId)) as Wallet

        const withdrawalOutput = enhancedOutputs.find(
          (output) => output.type === 'receive' && output.utxo.address === withdrawal.destination
        ) as UtxoOutput

        const destinationWallet = (await db.wallets.get(withdrawalOutput.utxo.walletId)) as Wallet

        const withdrawalSummary: RegularTransactionSummary = {
          timestamp,
          fee: withdrawal.fee,
          category: fee || withdrawal.fee ? 'expense' : 'neutral',
          type: 'withdrawal',
          amount: withdrawalOutput.amount,
          primary: { type: 'wallet', value: destinationWallet },
          secondary: { type: 'wallet', value: withdrawalWallet },
          inputs: enhancedInputs,
          outputs: enhancedOutputs
        }

        return withdrawalSummary
      }

      const depositOutput = enhancedOutputs.find(({ type }) => type === 'deposit') as
        | DepositOutput
        | undefined

      if (depositOutput) {
        const { deposit } = depositOutput
        const depositWallet = (await db.wallets.get(deposit.walletId)) as Wallet
        const sourceInput = enhancedInputs.find((input) => input.type === 'spend') as SpendInput
        const sourceWallet = (await db.wallets.get(sourceInput.utxo.walletId)) as Wallet

        const depositSummary: RegularTransactionSummary = {
          timestamp,
          fee: fee || 0,
          category: fee ? 'expense' : 'neutral',
          type: 'deposit',
          amount: deposit.amount,
          primary: { type: 'wallet', value: sourceWallet },
          secondary: { type: 'wallet', value: depositWallet },
          inputs: enhancedInputs,
          outputs: enhancedOutputs
        }

        return depositSummary
      }

      const transferOutput = enhancedOutputs.find(({ type }) => type === 'transfer') as
        | UtxoOutput
        | undefined

      if (transferOutput) {
        const sourceInput = enhancedInputs.find(
          (input) => input.type === 'spend' && input.utxo.walletId !== transferOutput.utxo.walletId
        ) as SpendInput

        const sourceWallet = (await db.wallets.get(sourceInput.utxo.walletId)) as Wallet
        const destinationWallet = (await db.wallets.get(transferOutput.utxo.walletId)) as Wallet

        const transferSummary: RegularTransactionSummary = {
          timestamp,
          fee: fee || 0,
          category: fee ? 'expense' : 'neutral',
          type: 'transfer',
          amount: transferOutput.utxo.amount,
          primary: { type: 'wallet', value: sourceWallet },
          secondary: { type: 'wallet', value: destinationWallet },
          inputs: enhancedInputs,
          outputs: enhancedOutputs
        }

        return transferSummary
      }

      const sendOutput = enhancedOutputs.find(({ type }) => type === 'send')

      if (sendOutput) {
        const sourceInput = enhancedInputs.find(({ type }) => type === 'spend') as SpendInput
        const sourceWallet = (await db.wallets.get(sourceInput.utxo.walletId)) as Wallet
        const destinationAddress = sendOutput.address
        const destinationMetadata = await db.metadata.get(destinationAddress)

        const destinationContact = destinationMetadata?.contact
          ? await db.contacts.get(destinationMetadata.contact)
          : null

        const sendSummary: RegularTransactionSummary = {
          timestamp,
          fee: fee || 0,
          category: fee ? 'expense' : 'neutral',
          type: 'send',
          amount: sendOutput.amount,
          primary: { type: 'wallet', value: sourceWallet },
          secondary: destinationContact
            ? { type: 'contact', value: destinationContact }
            : { type: 'unknown', value: destinationAddress },
          inputs: enhancedInputs,
          outputs: enhancedOutputs
        }

        return sendSummary
      }

      const sweepOutput = enhancedOutputs.find(({ type }) => type === 'sweep') as
        | SweepOutput
        | undefined

      if (sweepOutput) {
        const { channel } = sweepOutput
        const wallet = (await db.wallets.get(sweepOutput.utxo.walletId)) as Wallet
        const peerWallet =
          channel.peerId && (await db.wallets.where({ nodeId: channel.peerId }).first())

        const sweepSummary: RegularTransactionSummary = {
          timestamp,
          fee: fee || 0,
          category: fee ? 'expense' : 'neutral',
          type: 'sweep',
          amount: sweepOutput.amount,
          primary: { type: 'wallet', value: wallet },
          secondary: peerWallet
            ? { type: 'wallet', value: peerWallet }
            : { type: 'channel_peer', value: channel.peerAlias || channel.peerId },
          inputs: enhancedInputs,
          outputs: enhancedOutputs
        }

        return sweepSummary
      }

      const receiveOutput = enhancedOutputs.find(({ type }) => type === 'receive') as
        | UtxoOutput
        | undefined

      if (receiveOutput) {
        const receiveWallet = (await db.wallets.get(receiveOutput.utxo.walletId)) as Wallet
        const inputOutpoints = enhancedInputs.map(({ outpoint }) => outpoint)
        const inputMetadata = await db.metadata.where('id').anyOf(inputOutpoints).toArray()
        const inputMetadatWithContact = inputMetadata.find(({ contact }) => contact)

        const sourceContact = inputMetadatWithContact?.contact
          ? await db.contacts.get(inputMetadatWithContact.contact)
          : null

        const receiveSummary: RegularTransactionSummary = {
          timestamp,
          fee: 0,
          category: 'income',
          type: 'receive',
          amount: receiveOutput.amount,
          primary: { type: 'wallet', value: receiveWallet },
          secondary: sourceContact
            ? { type: 'contact', value: sourceContact }
            : { type: 'unknown', value: inputOutpoints[0] },
          inputs: enhancedInputs,
          outputs: enhancedOutputs
        }

        return receiveSummary
      }

      const unknownSummary: RegularTransactionSummary = {
        timestamp,
        fee: 0,
        category: 'income',
        type: 'receive',
        amount: enhancedOutputs.reduce((total, output) => total + output.amount, 0),
        primary: { type: 'unknown', value: enhancedInputs[0].outpoint },
        secondary: { type: 'unknown', value: enhancedOutputs[0].address },
        inputs: enhancedInputs,
        outputs: enhancedOutputs
      }

      return unknownSummary
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
}: Invoice): Promise<InvoiceSummary> => {
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

    const type = transferWallet ? 'transfer' : direction

    let primary: CounterPart
    let secondary: CounterPart
    let counterparty: CounterPart

    if (transferWallet) {
      counterparty = { type: 'wallet', value: transferWallet }
    } else if (requestContact || nodeIdContact) {
      counterparty = { type: 'contact', value: (requestContact || nodeIdContact) as Contact }
    } else {
      counterparty = { type: 'unknown', value: request || nodeId }
    }

    if (direction === 'receive') {
      primary = counterparty
      secondary = { type: 'wallet', value: wallet }
    } else {
      secondary = counterparty
      primary = { type: 'wallet', value: wallet }
    }

    const invoiceSummary: InvoiceSummary = {
      timestamp: completedAt || createdAt,
      fee: fee || 0,
      category: (type === 'transfer' && fee) || type === 'send' ? 'expense' : 'income',
      type,
      amount,
      primary,
      secondary
    }

    return invoiceSummary
  })
}

export const deriveAddressSummary = async ({
  createdAt,
  amount,
  walletId
}: Address): Promise<AddressSummary> => {
  const wallet = (await db.wallets.get(walletId)) as Wallet

  return {
    timestamp: createdAt,
    fee: 0,
    category: 'neutral',
    type: 'receive',
    amount,
    primary: { type: 'wallet', value: wallet },
    secondary: { type: 'unknown', value: '' }
  }
}
