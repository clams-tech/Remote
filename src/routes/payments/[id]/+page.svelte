<script lang="ts">
  import type { Network, PaymentStatus } from '$lib/@types/common.js'
  import type { Wallet } from '$lib/@types/wallets.js'
  import type { Invoice } from '$lib/@types/invoices.js'
  import type { Transaction } from '$lib/@types/transactions.js'
  import { formatDate } from '$lib/dates.js'
  import { db } from '$lib/db/index.js'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import ExpiryCountdown from '$lib/components/ExpiryCountdown.svelte'
  import Msg from '$lib/components/Msg.svelte'
  import Qr from '$lib/components/Qr.svelte'
  import Section from '$lib/components/Section.svelte'
  import Spinner from '$lib/components/Spinner.svelte'
  import SummaryRow from '$lib/components/SummaryRow.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import check from '$lib/icons/check.js'
  import warning from '$lib/icons/warning.js'
  import { fade } from 'svelte/transition'
  import type { PageData } from './$types.js'
  import CopyValue from '$lib/components/CopyValue.svelte'
  import { getNetwork, truncateValue } from '$lib/utils.js'
  import link from '$lib/icons/link.js'
  import { liveQuery } from 'dexie'
  import caret from '$lib/icons/caret.js'
  import { satsToBtcString } from '$lib/conversion.js'
  import { goto } from '$app/navigation'
  import Summary from '../Summary.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import { from, type Observable } from 'rxjs'
  import channelIcon from '$lib/icons/channels.js'
  import type { Channel } from '$lib/@types/channels.js'
  import keys from '$lib/icons/keys.js'
  import walletIcon from '$lib/icons/wallet.js'
  import { updateCounterPartyNodeInfo } from '../utils.js'

  import {
    deriveInvoiceSummary,
    deriveTransactionSummary,
    type EnhancedInput,
    type PaymentSummary,
    type EnhancedOutput,
    deriveAddressSummary,
    type RegularTransactionSummary,
    type ChannelTransactionSummary
  } from '$lib/summary.js'

  export let data: PageData

  type QRValue = { label: string; value: string }

  /** payment id could be an invoice.id, transaction.id or an onchain receive address*/
  const { id } = data

  type TransactionDetail = {
    type: 'invoice' | 'address' | 'onchain'
    qrValues?: QRValue[]
    status: PaymentStatus
    request?: string
    paymentHash?: string
    paymentPreimage?: string
    txid?: string
    amount: number
    fee?: number
    description?: string
    createdAt?: number
    completedAt?: number
    expiresAt?: number
    peerNodeId?: string
    wallet: Wallet
    category: PaymentSummary['category']
    summaryType: PaymentSummary['type']
    offer?: Invoice['offer']
    channels?: Channel[]
    inputs?: EnhancedInput[]
    outputs?: EnhancedOutput[]
    primary: PaymentSummary['primary']
    secondary: PaymentSummary['secondary']
    timestamp: PaymentSummary['timestamp']
    network: Network
    blockHeight?: number | null
  }

  const transactionDetails$: Observable<TransactionDetail[]> = from(
    liveQuery(async () => {
      return db.transaction(
        'r',
        db.invoices,
        db.addresses,
        db.transactions,
        db.wallets,
        db.channels,
        db.withdrawals,
        // @ts-ignore
        db.deposits,
        db.metadata,
        db.contacts,
        db.utxos,
        db.offers,
        db.nodes,
        async (): Promise<TransactionDetail[]> => {
          const [invoices, address, transactions] = await Promise.all([
            db.invoices.where({ id }).toArray(),
            db.addresses.get(id),
            db.transactions.where({ id }).toArray()
          ])

          const details: TransactionDetail[] = []

          if (invoices.length) {
            // prefer sender invoice if multiple copies
            const invoice = invoices.find(({ direction }) => direction === 'send') || invoices[0]

            const {
              request,
              status,
              amount,
              description,
              createdAt,
              completedAt,
              walletId,
              offer,
              direction,
              expiresAt,
              fee,
              hash,
              preimage,
              nodeId
            } = invoice

            const wallet = (await db.wallets.get(walletId)) as Wallet
            const withdrawalOfferId = offer ? await tryFindWithdrawalOfferId(offer) : undefined

            const formattedOffer =
              offer && withdrawalOfferId ? { id: withdrawalOfferId, ...offer } : offer

            let { category, type, primary, secondary, timestamp } = (await deriveInvoiceSummary({
              ...invoice,
              offer: formattedOffer
            })) as PaymentSummary

            details.push({
              type: 'invoice',
              qrValues:
                status === 'pending' && request
                  ? [
                      {
                        label: $translate('app.labels.invoice'),
                        value: `lightning:${request.toUpperCase()}`
                      }
                    ]
                  : undefined,
              status,
              amount,
              description,
              createdAt,
              completedAt,
              expiresAt,
              wallet,
              offer: formattedOffer,
              fee,
              request,
              paymentHash: hash,
              paymentPreimage: preimage,
              peerNodeId: direction === 'send' ? nodeId : undefined,
              category,
              summaryType: type,
              primary,
              secondary,
              timestamp,
              network: getNetwork(request || '')
            })
          }

          if (address) {
            const { value, walletId, createdAt, amount, txid, message, completedAt, label } =
              address

            const wallet = (await db.wallets.get(walletId)) as Wallet
            const searchParams = new URLSearchParams()

            if (amount && amount !== 0) {
              searchParams.append('amount', satsToBtcString(amount))
            }

            if (label) {
              searchParams.append('label', label)
            }

            if (message) {
              searchParams.append('message', message)
            }

            let tx: Transaction | null = null

            if (txid) {
              tx = (await db.transactions.where({ id: txid, walletId }).first()) as Transaction
            }

            const status = txid ? (tx?.blockheight ? 'complete' : 'pending') : 'waiting'
            const qrValues: QRValue[] = []

            if (status === 'waiting') {
              qrValues.push({
                label: $translate('app.labels.address'),
                value: `bitcoin:${value.toUpperCase()}${
                  Array.from(searchParams.keys()).length ? `?${searchParams.toString()}` : ''
                }`
              })
            }

            const [invoice] = invoices

            if (invoice?.request && invoice?.status === 'pending') {
              searchParams.append('lightning', invoice.request.toUpperCase())

              qrValues.push({
                label: $translate('app.labels.unified'),
                value: `bitcoin:${value.toUpperCase()}${
                  Array.from(searchParams.keys()).length ? `?${searchParams.toString()}` : ''
                }`
              })
            }

            const summary = await deriveAddressSummary(address)

            details.push({
              type: 'address',
              qrValues,
              status,
              amount,
              description: message,
              createdAt,
              completedAt,
              wallet,
              txid,
              category: 'income',
              summaryType: 'receive',
              primary: summary.primary,
              secondary: summary.secondary,
              timestamp: createdAt,
              network: getNetwork(value)
            })
          }

          if (transactions.length) {
            const spentInputUtxo = await db.utxos
              .where('id')
              .anyOf(transactions[0].inputs.map(({ txid, index }) => `${txid}:${index}`))
              .first()

            // prefer spender transaction where possible
            const transaction =
              transactions.find(({ walletId }) => walletId === spentInputUtxo?.walletId) ||
              transactions[0]

            const { id, walletId, fee, blockheight, timestamp } = transaction
            const wallet = (await db.wallets.get(walletId)) as Wallet
            const summary = await deriveTransactionSummary(transaction)

            const { amount, inputs, outputs } = summary as RegularTransactionSummary

            details.push({
              type: 'onchain',
              status: blockheight ? 'complete' : 'pending',
              amount,
              fee,
              channels: (summary as ChannelTransactionSummary).channels,
              wallet,
              completedAt: typeof blockheight === 'number' ? timestamp : undefined,
              txid: id,
              inputs,
              outputs,
              category: summary.category,
              summaryType: summary.type,
              primary: summary.primary,
              secondary: summary.secondary,
              timestamp: summary.timestamp,
              network: getNetwork(transaction.outputs[0].address),
              blockHeight: blockheight
            })
          }

          return details
        }
      ) as Promise<TransactionDetail[]>
    })
  )

  let transactionDetailToShow: TransactionDetail | undefined

  $: if ($transactionDetails$) {
    const details = $transactionDetails$
    const completed = details.find(({ status }) => status === 'complete')
    const pendingTransaction = details.find(
      ({ type, status }) => type === 'onchain' && status === 'pending'
    )
    const invoice = details.find(({ type }) => type === 'invoice')

    if (details.length === 1) {
      transactionDetailToShow = details[0]
    } else if (completed) {
      transactionDetailToShow = completed
    } else if (pendingTransaction) {
      transactionDetailToShow = pendingTransaction
    } else {
      transactionDetailToShow = invoice
    }

    if (transactionDetailToShow) {
      updateCounterPartyNodeInfo(transactionDetailToShow.secondary).then(node => {
        if (node && transactionDetailToShow) {
          transactionDetailToShow.secondary = { type: 'node', value: node }
        }
      })
    }
  }

  $: qrValues = $transactionDetails$
    ? $transactionDetails$.reduce(
        (values, { qrValues }) => [...values, ...(qrValues || [])],
        [] as QRValue[]
      )
    : []

  const handlePaymentExpire = async () => {
    await db.invoices.where({ id }).modify({ status: 'expired' })
  }

  const tryFindWithdrawalOfferId = async (offerDetails: Invoice['offer']) => {
    const { description, issuer } = offerDetails!
    const withdrawalOffer = await db.offers.get({ description, type: 'withdraw', issuer })
    return withdrawalOffer?.id
  }

  const getRoute = (inputOutput: EnhancedOutput | EnhancedInput) => {
    switch (inputOutput.type) {
      case 'timelocked':
      case 'channel_close':
      case 'channel_open': {
        return `/channels/${inputOutput.channel.id}`
      }
      case 'deposit': {
        return `/deposits/${inputOutput.deposit.id}`
      }
      case 'sweep':
      case 'change':
      case 'spend':
      case 'transfer':
      case 'receive': {
        return `/utxos/${inputOutput.utxo.id}`
      }
      case 'settle':
        return inputOutput.utxo
          ? `/utxos/${inputOutput.utxo.id}`
          : `/channels/${inputOutput.channel.id}`
      case 'withdrawal':
        return `/wallets/${inputOutput.withdrawal.walletId}`
      case 'deposit':
        return `/wallets/${inputOutput.deposit.walletId}`
    }
  }
</script>

<svelte:head>
  <title>{$translate('app.routes./transaction.title')}</title>
</svelte:head>

<Section>
  {#if !$transactionDetails$}
    <div class="mt-4">
      <Spinner />
    </div>
  {:else if !$transactionDetails$.length}
    <SectionHeading text={$translate('app.labels.payment')} />
    <div class="mt-4">
      <Msg type="error" closable={false} message={$translate('app.errors.payment_not_found')} />
    </div>
  {:else if transactionDetailToShow}
    {@const {
      status,
      paymentHash,
      paymentPreimage,
      txid,
      amount,
      fee,
      description,
      createdAt,
      completedAt,
      expiresAt,
      peerNodeId,
      wallet,
      offer,
      channels,
      inputs,
      outputs,
      category,
      primary,
      secondary,
      summaryType,
      network,
      blockHeight
    } = transactionDetailToShow}

    <div class="w-full flex justify-center items-center text-3xl font-semibold text-center">
      <Summary {primary} {secondary} type={summaryType} {network} {status} centered />
    </div>
    {#if qrValues.length}
      <div class="flex flex-col w-full items-center my-4">
        <Qr values={qrValues} />

        {#if expiresAt}
          <ExpiryCountdown on:expired={handlePaymentExpire} expiry={expiresAt} />
        {/if}
      </div>
    {/if}

    <div class="w-full flex justify-center mt-2">
      <div class="w-full">
        {#if typeof amount === 'number'}
          <SummaryRow>
            <span slot="label">{$translate('app.labels.amount')}:</span>
            <div slot="value">
              {#if amount === 0}
                <div>{$translate('app.labels.any_amount')}</div>
              {:else}
                <BitcoinAmount sats={amount} />
              {/if}
            </div>
          </SummaryRow>
        {/if}

        <SummaryRow>
          <span slot="label">{$translate('app.labels.wallet')}:</span>
          <a href={`/wallets/${wallet.id}`} slot="value" class="no-underline flex items-center"
            >{wallet.label}
            <div class="w-6 ml-1 -rotate-90">{@html caret}</div></a
          >
        </SummaryRow>

        <SummaryRow>
          <span slot="label">{$translate('app.labels.status')}:</span>
          <span
            class:text-utility-success={status === 'complete'}
            class:text-utility-error={status === 'expired' || status === 'failed'}
            class:text-utility-pending={status === 'pending' || status === 'waiting'}
            class="flex items-center"
            slot="value"
          >
            {status}
            {#if status === 'pending' || status === 'waiting'}
              <div class="ml-1">
                <Spinner size="1rem" />
              </div>
            {/if}

            {#if status === 'complete'}
              <div class="w-4 ml-1 border border-utility-success rounded-full">
                {@html check}
              </div>
            {/if}

            {#if status === 'expired' || status == 'failed'}
              <div class="w-4 ml-1">
                {@html warning}
              </div>
            {/if}
          </span>
        </SummaryRow>

        {#if txid}
          <SummaryRow>
            <span slot="label">{$translate('app.labels.txid')}:</span>
            <a
              slot="value"
              href={`https://mempool.space/tx/${txid}`}
              target="_blank"
              rel="noreferrer noopener"
              class="flex items-center no-underline"
            >
              {truncateValue(txid)}
              <div in:fade|local={{ duration: 250 }} class="w-6 cursor-pointer ml-1">
                {@html link}
              </div>
            </a>
          </SummaryRow>
        {/if}

        {#if description && !offer?.description}
          <SummaryRow baseline>
            <span slot="label">{$translate('app.labels.description')}:</span>
            <span slot="value" class="w-full">{description}</span>
          </SummaryRow>
        {/if}

        {#if inputs}
          <SummaryRow baseline>
            <span slot="label">{$translate('app.labels.inputs')}:</span>
            <div class="gap-y-1 flex flex-col text-sm" slot="value">
              {#each inputs as input}
                {@const { type, outpoint } = input}
                {@const route = getRoute(input)}

                <div
                  class="flex items-center w-full rounded-full bg-neutral-800 hover:bg-neutral-700 transition-colors py-1 px-4"
                >
                  <button
                    on:click={() => {
                      route && goto(route)
                    }}
                  >
                    <div class="text-xs flex items-center">
                      <div class="mr-1 flex items-center">
                        {#if type !== 'unknown'}
                          <div class="w-4 mr-0.5 -ml-0.5">
                            {@html type === 'channel_close' || type === 'timelocked'
                              ? channelIcon
                              : type === 'spend'
                              ? keys
                              : type === 'withdrawal'
                              ? walletIcon
                              : ''}
                          </div>
                        {/if}
                        {$translate(`app.labels.input_${type}`).toLowerCase()}:
                      </div>
                      <div class="font-semibold text-purple-100 uppercase flex items-center">
                        {#if type === 'timelocked' || type === 'channel_close'}
                          {@const { channel } = input}
                          {#if channel.peerId}
                            {#await db.wallets
                              .where({ nodeId: channel.peerId })
                              .first() then peerWallet}
                              {peerWallet?.label ||
                                channel.peerAlias ||
                                truncateValue(channel.peerId || $translate('app.labels.unknown'))}
                            {/await}
                          {/if}
                        {:else if type === 'withdrawal'}
                          {@const { withdrawal } = input}
                          {#await db.wallets.get(withdrawal.walletId) then wallet}
                            {wallet?.label}
                          {/await}
                        {:else if type === 'spend'}
                          {@const { utxo } = input}
                          {#await db.wallets.get(utxo.walletId) then wallet}
                            {wallet?.label}
                          {/await}
                        {:else}
                          {truncateValue(outpoint)}
                        {/if}
                      </div>
                    </div>

                    {#if type === 'spend'}
                      <BitcoinAmount sats={input.utxo.amount} />
                    {/if}
                  </button>

                  {#if route}
                    <div class="w-4 ml-1 -mr-2 -rotate-90">{@html caret}</div>
                  {/if}
                </div>
              {/each}
            </div>
          </SummaryRow>
        {/if}

        {#if outputs}
          <SummaryRow baseline>
            <span slot="label">{$translate('app.labels.outputs')}:</span>
            <div class="gap-y-1 flex flex-col justify-center items-center text-sm" slot="value">
              {#each outputs as output}
                {@const { type, amount, address } = output}
                {@const route = getRoute(output)}

                <div
                  class="flex items-center w-full justify-between rounded-full bg-neutral-800 hover:bg-neutral-700 transition-colors py-1 px-4"
                >
                  <button
                    on:click={async () => {
                      route && goto(route)
                    }}
                  >
                    <div class="text-xs flex items-center">
                      <div class="mr-1 flex items-center">
                        {#if type !== 'unknown' && type !== 'send'}
                          <div class="w-4 mr-0.5 -ml-0.5">
                            {@html type === 'channel_open' ||
                            type === 'timelocked' ||
                            (type === 'settle' && !output.utxo)
                              ? channelIcon
                              : type === 'receive' ||
                                type === 'change' ||
                                type === 'transfer' ||
                                type === 'sweep' ||
                                (type === 'settle' && output.utxo)
                              ? keys
                              : type === 'deposit'
                              ? walletIcon
                              : ''}
                          </div>
                        {/if}

                        {$translate(`app.labels.output_${type}`).toLowerCase()}:
                      </div>
                      <div class="font-semibold text-purple-100 uppercase flex items-center">
                        {#if type === 'receive' || type === 'change' || type === 'transfer' || type === 'sweep'}
                          {@const { utxo } = output}
                          {#await db.wallets.get(utxo.walletId) then wallet}
                            {wallet?.label}
                          {/await}
                        {:else if type === 'settle'}
                          {@const { utxo } = output}
                          {#if utxo}
                            {#await db.wallets.get(utxo.walletId) then wallet}
                              {wallet?.label}
                            {/await}
                          {:else}
                            {@const { channel } = output}
                            {#await db.wallets
                              .where({ nodeId: channel.peerId })
                              .first() then wallet}
                              {#if wallet}
                                {wallet.label}
                              {:else}
                                {channel.peerAlias ||
                                  truncateValue(channel.peerId || $translate('app.labels.unknown'))}
                              {/if}
                            {/await}
                          {/if}
                        {:else if type === 'timelocked' || type === 'channel_open'}
                          {@const { channel } = output}
                          {#if channel.peerId}
                            {#await db.wallets
                              .where({ nodeId: channel.peerId })
                              .first() then peerWallet}
                              {#if peerWallet}
                                {peerWallet.label}
                              {:else}
                                {channel.peerAlias ||
                                  truncateValue(
                                    channel.peerId || $translate('app.labels.unknown'),
                                    6
                                  )}
                              {/if}
                            {/await}
                          {/if}
                        {:else if type === 'deposit'}
                          {@const { deposit } = output}
                          {#await db.wallets.get(deposit.walletId) then wallet}
                            {wallet?.label}
                          {/await}
                        {:else}
                          {truncateValue(address)}
                        {/if}
                      </div>
                    </div>
                    <BitcoinAmount sats={amount} />
                  </button>

                  {#if route}
                    <div class="w-4 ml-1 -mr-2 -rotate-90">{@html caret}</div>
                  {/if}
                </div>
              {/each}
            </div>
          </SummaryRow>
        {/if}

        {#if fee}
          <SummaryRow>
            <span slot="label"
              >{$translate(
                `app.labels.${
                  (summaryType === 'channel_close' || summaryType === 'channel_force_close') &&
                  fee < 1
                    ? 'lost_to_rounding'
                    : 'fee'
                }`
              )}:</span
            >
            <div class="flex items-center" slot="value">
              <BitcoinAmount sats={fee} />
            </div>
          </SummaryRow>
        {/if}

        {#if blockHeight}
          <SummaryRow>
            <span slot="label">{$translate('app.labels.included_in_block')}:</span>
            <div slot="value">
              {blockHeight}
            </div>
          </SummaryRow>
        {/if}

        {#if channels?.length}
          {@const [channel] = channels}
          <!-- {@const { ourToSelfDelay, closer, status } = channel} -->

          <SummaryRow>
            <span slot="label">{$translate('app.labels.channel_id')}:</span>
            <a slot="value" href={`/channels/${channel.id}`} class="flex items-center">
              {truncateValue(channel.id)}
              <div in:fade|local={{ duration: 250 }} class="w-4 -rotate-90">
                {@html caret}
              </div>
            </a>
          </SummaryRow>

          {#await db.wallets.where({ nodeId: channel.peerId }).first() then peerWallet}
            {#if peerWallet || channel.peerAlias}
              <SummaryRow>
                <span slot="label">{$translate('app.labels.channel_peer')}:</span>
                <span slot="value">
                  {peerWallet?.label || channel.peerAlias}
                </span>
              </SummaryRow>
            {/if}
          {/await}

          <!-- @TODO - Could add back in to show blocks until setWeekWithOptions, but needs to be reliable -->
          <!-- {#if status === 'force_closed' && closer === 'local' && ourToSelfDelay}
            <SummaryRow>
              <span slot="label">{$translate('app.labels.can_sweep')}:</span>
              <div slot="value">
                <div>
                  {ourToSelfDelay}
                  {$translate('app.labels.blocks')}
                </div>

                {#await formatDateRelativeToNow(Date.now() / 1000 + ourToSelfDelay * 10 * MIN_IN_SECS) then date}
                  <div class="text-xs">
                    (estimated {date})
                  </div>
                {/await}
              </div>
            </SummaryRow>
          {/if} -->
        {/if}

        {#if offer}
          {@const { id, issuer, payerNote, description } = offer}
          {#if id}
            <SummaryRow>
              <span slot="label">{$translate('app.labels.offer')}:</span>
              <a slot="value" href={`/offers/${id}`} class="flex items-center">
                {truncateValue(id)}
                <div in:fade|local={{ duration: 250 }} class="w-6 cursor-pointer ml-1 -rotate-90">
                  {@html caret}
                </div>
              </a>
            </SummaryRow>
          {/if}

          {#if issuer}
            <SummaryRow>
              <span slot="label">{$translate('app.labels.offer_issuer')}:</span>
              <div slot="value">
                {issuer}
              </div>
            </SummaryRow>
          {/if}

          {#if description}
            <SummaryRow>
              <span slot="label">{$translate('app.labels.offer_description')}:</span>
              <span slot="value">{description}</span>
            </SummaryRow>
          {/if}

          {#if payerNote}
            <SummaryRow>
              <span slot="label"
                >{$translate('app.labels.payer_note', {
                  direction: category === 'income' ? 'receive' : 'send'
                })}:</span
              >
              <span slot="value">{payerNote}</span>
            </SummaryRow>
          {/if}
        {/if}

        {#if completedAt}
          <SummaryRow>
            <span slot="label">{$translate('app.labels.completed_at')}:</span>
            <span slot="value">
              {#await formatDate(completedAt, 'h:mmaaa - EEEE do LLL') then formatted}
                <span in:fade|local={{ duration: 50 }}>{formatted}</span>
              {/await}
            </span>
          </SummaryRow>
        {:else if createdAt}
          <SummaryRow>
            <span slot="label">{$translate('app.labels.created_at')}:</span>
            <span slot="value">
              {#await formatDate(createdAt) then formatted}
                <span in:fade|local={{ duration: 50 }}>{formatted}</span>
              {/await}
            </span>
          </SummaryRow>
        {/if}

        {#if peerNodeId}
          <SummaryRow>
            <span slot="label">{$translate('app.labels.destination')}:</span>
            <div slot="value">
              <CopyValue value={peerNodeId} truncateLength={9} />
            </div>
          </SummaryRow>
        {/if}

        {#if paymentHash}
          <SummaryRow>
            <span slot="label">{$translate('app.labels.payment_hash')}:</span>
            <div slot="value">
              <CopyValue value={paymentHash} truncateLength={9} />
            </div>
          </SummaryRow>
        {/if}

        {#if paymentPreimage}
          <SummaryRow>
            <span slot="label">{$translate('app.labels.payment_preimage')}:</span>
            <div slot="value">
              <CopyValue value={paymentPreimage} truncateLength={9} />
            </div>
          </SummaryRow>
        {/if}
      </div>
    </div>
  {/if}
</Section>
