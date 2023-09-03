<script lang="ts">
  import type { TransactionStatus } from '$lib/@types/common.js'
  import type { Wallet } from '$lib/@types/wallets.js'
  import type { Invoice } from '$lib/@types/invoices.js'
  import type { Transaction } from '$lib/@types/transactions.js'
  import { formatDate } from '$lib/dates.js'
  import { db } from '$lib/db.js'
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
  import { getTestnet, truncateValue } from '$lib/utils.js'
  import link from '$lib/icons/link.js'
  import { liveQuery } from 'dexie'
  import caret from '$lib/icons/caret.js'
  import { satsToBtcString } from '$lib/conversion.js'
  import { goto } from '$app/navigation'
  import type { Deposit } from '$lib/@types/deposits.js'

  import {
    deriveInvoiceSummary,
    deriveReceiveAddressSummary,
    deriveTransactionSummary,
    enhanceInputsOutputs,
    type EnhancedInput,
    type PaymentSummary,
    type TransactionSummary,
    type EnhancedOutput
  } from '$lib/summary.js'
  import Summary from '../components/Summary.svelte'

  export let data: PageData

  type QRValue = { label: string; value: string }

  /** payment id could be an invoice.id, transaction.id or an onchain receive address*/
  const { id } = data

  type TransactionDetail = {
    type: 'invoice' | 'address' | 'onchain'
    qrValues?: QRValue[]
    status: TransactionStatus
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
    category: TransactionSummary['category']
    summaryType: TransactionSummary['type']
    offer?: Invoice['offer']
    channel?: Transaction['channel']
    inputs?: EnhancedInput[]
    outputs?: EnhancedOutput[]
    primary: TransactionSummary['primary']
    secondary: TransactionSummary['secondary']
    timestamp: TransactionSummary['timestamp']
    testnet: 'testnet' | 'regtest' | 'signet' | null
  }

  const transactionDetails$ = liveQuery(async () => {
    const [invoice, address, transaction] = await Promise.all([
      db.invoices.get(id),
      db.addresses.get(id),
      db.transactions.get(id)
    ])

    const details: TransactionDetail[] = []

    if (invoice) {
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
      const { category, type, primary, secondary, timestamp } = (await deriveInvoiceSummary(
        invoice
      )) as PaymentSummary

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
        offer: offer && withdrawalOfferId ? { id: withdrawalOfferId, ...offer } : offer,
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
        testnet: getTestnet(request || '')
      })
    }

    if (address) {
      const { value, walletId, createdAt, amount, txid, message, completedAt, label } = address
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
        tx = (await db.transactions.get(txid)) as Transaction
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

      if (invoice && invoice.request && invoice.status === 'pending') {
        searchParams.append('lightning', invoice.request.toUpperCase())

        qrValues.push({
          label: $translate('app.labels.unified'),
          value: `bitcoin:${value.toUpperCase()}${
            Array.from(searchParams.keys()).length ? `?${searchParams.toString()}` : ''
          }`
        })
      }

      const summary = await deriveReceiveAddressSummary(address)

      details.push({
        type: 'address',
        qrValues,
        status,
        amount,
        description: message,
        createdAt,
        completedAt,
        wallet,
        channel: tx?.channel,
        txid,
        category: summary.category,
        summaryType: summary.type,
        primary: summary.primary,
        secondary: summary.secondary,
        timestamp: summary.timestamp,
        testnet: getTestnet(value)
      })
    }

    if (transaction) {
      const { id, walletId, fee, blockheight, channel, timestamp } = transaction

      const wallet = (await db.wallets.get(walletId)) as Wallet
      const { inputs, outputs } = await enhanceInputsOutputs(transaction)
      const summary = await deriveTransactionSummary({ inputs, outputs, timestamp, fee, channel })

      details.push({
        type: 'onchain',
        status: typeof blockheight === 'number' ? 'complete' : 'pending',
        amount: (summary as PaymentSummary).amount,
        fee,
        channel,
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
        testnet: getTestnet(transaction.outputs[0].address)
      })
    }

    return details
  })

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
  }

  $: qrValues = $transactionDetails$
    ? $transactionDetails$.reduce(
        (values, { qrValues }) => [...values, ...(qrValues || [])],
        [] as QRValue[]
      )
    : []

  const handlePaymentExpire = async () => {
    await db.invoices.update(id, { status: 'expired' })
  }

  const tryFindWithdrawalOfferId = async (offerDetails: Invoice['offer']) => {
    const { description, issuer } = offerDetails!
    const withdrawalOffer = await db.offers.get({ description, type: 'withdraw', issuer })
    return withdrawalOffer?.id
  }

  const getRoute = async (inputOutput: EnhancedOutput | EnhancedInput) => {
    switch (inputOutput.category) {
      case 'channel_open': {
        return `/channels/${id}`
      }
      case 'deposit': {
        const deposit = (await db.deposits.get(id)) as Deposit
        return `/wallets/${deposit.walletId}`
      }
      case 'transfer':
      case 'receive': {
        return `/wallets/${id}`
      }
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
    <div class="mt-4">
      <Msg type="error" closable={false} message={$translate('app.errors.transaction_not_found')} />
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
      channel,
      inputs,
      outputs,
      category,
      primary,
      secondary,
      summaryType,
      testnet
    } = transactionDetailToShow}

    {#if qrValues.length}
      <div class="flex flex-col w-full items-center my-4">
        <Qr values={qrValues} />

        {#if expiresAt}
          <ExpiryCountdown on:expired={handlePaymentExpire} expiry={expiresAt} />
        {/if}
      </div>
    {:else}
      <div class="w-full flex justify-center items-center text-3xl font-semibold text-center">
        <Summary {primary} {secondary} type={summaryType} {testnet} {status} />
      </div>
    {/if}

    <div class="w-full flex justify-center mt-2">
      <div class="w-full">
        <!-- amount -->
        {#if amount}
          <SummaryRow>
            <span slot="label">{$translate('app.labels.amount')}:</span>
            <div slot="value">
              <BitcoinAmount sats={amount} />
            </div>
          </SummaryRow>
        {/if}

        <!-- wallet -->
        <SummaryRow>
          <span slot="label">{$translate('app.labels.wallet')}:</span>
          <a href={`/wallets/${wallet.id}`} slot="value" class="no-underline flex items-center"
            >{wallet.label}
            <div class="w-6 ml-1 -rotate-90">{@html caret}</div></a
          >
        </SummaryRow>

        <!-- STATUS -->
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

        <!-- TXID -->
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

        <!-- DESCRIPTION -->
        {#if description && !offer?.description}
          <SummaryRow>
            <span slot="label">{$translate('app.labels.description')}:</span>
            <span slot="value">{description}</span>
          </SummaryRow>
        {/if}

        <!-- INPUTS -->
        {#if inputs}
          <SummaryRow baseline>
            <span slot="label">{$translate('app.labels.inputs')}:</span>
            <div class="gap-y-1 flex flex-col text-sm" slot="value">
              {#each inputs as input}
                {@const { id, category, utxo } = input}
                {@const routeProm = getRoute(input)}
                <div
                  class="flex items-center w-full rounded-full bg-neutral-800 hover:bg-neutral-900 transition-colors py-1 px-2"
                >
                  <button
                    on:click={async () => {
                      const route = await routeProm
                      route && goto(route)
                    }}
                  >
                    <div class="text-xs flex items-center">
                      <div
                        class="mr-1"
                        class:text-utility-pending={category === 'timelocked'}
                        class:text-utility-error={category === 'channel_close' ||
                          category === 'spend' ||
                          category === 'withdrawal'}
                      >
                        {$translate(`app.labels.input_${category}`)}:
                      </div>
                      <div>
                        {#if utxo}
                          {#await db.wallets.get(utxo.walletId) then wallet}
                            {wallet?.label || truncateValue(id)}
                          {/await}
                        {:else if category === 'channel_close'}
                          {#await db.channels.get(id) then channel}
                            {channel?.peerAlias || truncateValue(channel?.peerId || 'id')}
                          {/await}
                        {:else if category === 'withdrawal'}
                          {#await db.withdrawals
                            .get(id)
                            .then((withdrawal) => withdrawal && db.wallets.get(withdrawal.walletId)) then wallet}
                            {wallet?.label || truncateValue(id)}
                          {/await}
                        {:else}
                          {truncateValue(id)}
                        {/if}
                      </div>
                    </div>
                    {#if utxo?.amount}
                      <BitcoinAmount sats={utxo.amount} />
                    {/if}
                  </button>

                  {#await routeProm then route}
                    {#if route}
                      <div class="w-4 ml-1 -mr-2 -rotate-90">{@html caret}</div>
                    {/if}
                  {/await}
                </div>
              {/each}
            </div>
          </SummaryRow>
        {/if}

        <!-- OUTPUTS -->
        {#if outputs}
          <SummaryRow baseline>
            <span slot="label">{$translate('app.labels.outputs')}:</span>
            <div class="gap-y-1 flex flex-col justify-center items-center text-sm" slot="value">
              {#each outputs as output}
                {@const { id, category, utxo, amount } = output}
                {@const routeProm = getRoute(output)}

                <div
                  class="flex items-center w-full rounded-full bg-neutral-800 hover:bg-neutral-900 transition-colors py-1 px-4"
                >
                  <button
                    on:click={async () => {
                      const route = await routeProm
                      route && goto(route)
                    }}
                  >
                    <div class="text-xs flex items-center">
                      <div
                        class="mr-1"
                        class:text-utility-success={category === 'deposit' ||
                          category === 'receive' ||
                          category === 'settle' ||
                          category === 'sweep' ||
                          category === 'transfer'}
                        class:text-utility-error={category === 'send'}
                      >
                        {$translate(`app.labels.output_${category}`)}:
                      </div>
                      <div>
                        {#if utxo}
                          {#await db.wallets.get(utxo.walletId) then wallet}
                            {wallet?.label || truncateValue(id)}
                          {/await}
                        {:else if category === 'settle' || category === 'channel_open'}
                          {#await db.channels.get(id) then channel}
                            {channel?.peerAlias || truncateValue(channel?.peerId || 'id')}
                          {/await}
                        {:else if category === 'deposit'}
                          {#await db.deposits
                            .get(id)
                            .then((deposit) => deposit && db.wallets.get(deposit.walletId)) then wallet}
                            {wallet?.label || truncateValue(id)}
                          {/await}
                        {:else}
                          {truncateValue(id)}
                        {/if}
                      </div>
                    </div>
                    <BitcoinAmount sats={amount} />
                  </button>

                  {#await routeProm then route}
                    {#if route}
                      <div class="w-4 ml-1 -mr-2 -rotate-90">{@html caret}</div>
                    {/if}
                  {/await}
                </div>
              {/each}
            </div>
          </SummaryRow>
        {/if}

        <!-- FEE -->
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

        <!-- CHANNEL -->
        {#if channel}
          <SummaryRow>
            <span slot="label">{$translate('app.labels.channel_id')}:</span>
            <a slot="value" href={`/channels/${channel.id}`} class="flex items-center">
              {truncateValue(channel.id)}
              <div in:fade|local={{ duration: 250 }} class="w-4 -rotate-90">
                {@html caret}
              </div>
            </a>
          </SummaryRow>

          {#await db.channels.get(channel.id) then channelDetails}
            {#if channelDetails && channelDetails.peerAlias}
              <SummaryRow>
                <span slot="label">{$translate('app.labels.channel_peer')}:</span>
                <span slot="value">
                  {channelDetails.peerAlias}
                </span>
              </SummaryRow>
            {/if}
          {/await}
        {/if}

        <!-- OFFER -->
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

        <!-- TIMESTAMP -->
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

        <!-- DESTINATION -->
        {#if peerNodeId}
          <SummaryRow>
            <span slot="label">{$translate('app.labels.destination')}:</span>
            <div slot="value">
              <CopyValue value={peerNodeId} truncateLength={9} />
            </div>
          </SummaryRow>
        {/if}

        <!-- PAYMENT HASH -->
        {#if paymentHash}
          <SummaryRow>
            <span slot="label">{$translate('app.labels.payment_hash')}:</span>
            <div slot="value">
              <CopyValue value={paymentHash} truncateLength={9} />
            </div>
          </SummaryRow>
        {/if}

        <!-- PAYMENT PREIMAGE -->
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
