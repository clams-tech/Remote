<script lang="ts">
  import type { TransactionStatus } from '$lib/@types/common.js'
  import type { ConnectionDetails } from '$lib/@types/connections.js'
  import type { Invoice } from '$lib/@types/invoices.js'
  import type { ChannelEvent, Transaction } from '$lib/@types/transactions.js'
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
  import bitcoin from '$lib/icons/bitcoin.js'
  import check from '$lib/icons/check.js'
  import lightning from '$lib/icons/lightning.js'
  import warning from '$lib/icons/warning.js'
  import { fade } from 'svelte/transition'
  import type { PageData } from './$types.js'
  import CopyValue from '$lib/components/CopyValue.svelte'
  import { truncateValue } from '$lib/utils.js'
  import link from '$lib/icons/link.js'
  import channels from '$lib/icons/channels.js'
  import type { Channel } from '$lib/@types/channels.js'
  import { liveQuery } from 'dexie'
  import { msatsToBtc } from '$lib/conversion.js'

  export let data: PageData

  type QRValue = { label: string; value: string }

  /** payment id could be and invoice.id, transaction.id or an onchain receive address*/
  const { id } = data

  type TransactionDetail = {
    type: 'invoice' | 'address' | 'transaction'
    icon: string
    qrValues?: QRValue[]
    status: TransactionStatus
    paymentHash?: string
    paymentPreimage?: string
    txid?: string
    amount?: string
    fee?: string
    description?: string
    createdAt?: number
    completedAt?: number
    expiresAt?: number
    peerNodeId?: string
    connection: ConnectionDetails
    offer?: Invoice['offer']
    abs: '+' | '-'
    channelEvent?: ChannelEvent
    channel?: Channel
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
        connectionId,
        offer,
        direction,
        expiresAt,
        fee,
        hash,
        preimage,
        nodeId
      } = invoice

      const connection = (await db.connections.get(connectionId)) as ConnectionDetails
      const withdrawalOfferId = offer ? await tryFindWithdrawalOfferId(offer) : undefined

      details.push({
        type: 'invoice',
        icon: lightning,
        qrValues:
          status === 'pending'
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
        connection,
        offer: offer && withdrawalOfferId ? { id: withdrawalOfferId, ...offer } : offer,
        abs: direction === 'send' ? '-' : '+',
        fee,
        paymentHash: hash,
        paymentPreimage: preimage,
        peerNodeId: direction === 'send' ? nodeId : undefined
      })
    }

    if (address) {
      const { value, connectionId, createdAt, amount, txid, message, completedAt, label } = address
      const connection = (await db.connections.get(connectionId)) as ConnectionDetails

      let tx: Transaction | null = null

      if (txid) {
        tx = (await db.transactions.get(txid)) as Transaction
      }

      const status = txid ? (tx?.blockheight ? 'complete' : 'pending') : 'waiting'
      const qrValues: QRValue[] = []

      if (status === 'waiting') {
        qrValues.push({
          label: $translate('app.labels.address'),
          value: `bitcoin:${value.toUpperCase()}`
        })
      }

      if (invoice && invoice.status === 'pending') {
        qrValues.push({
          label: $translate('app.labels.unified'),
          value: `bitcoin:${value.toUpperCase()}?amount=${msatsToBtc(amount)}${
            label ? `&label=${encodeURIComponent(label)}` : ''
          }${
            message ? `&message=${encodeURIComponent(message)}` : ''
          }&lightning=${invoice.request.toUpperCase()}`
        })
      }

      details.push({
        type: 'address',
        icon: bitcoin,
        qrValues,
        status,
        amount,
        description: message,
        createdAt,
        completedAt,
        connection,
        abs: '+',
        channelEvent: tx?.events.find(
          ({ type }) => type === 'channelClose' || type === 'channelOpen'
        ) as ChannelEvent,
        txid
      })
    }

    if (transaction) {
      const { id, connectionId, events, blockheight } = transaction

      const channelEvent = events.find(
        ({ type }) => type === 'channelOpen' || type === 'channelClose'
      ) as ChannelEvent

      const balanceChange = events.find(({ type }) => type === 'deposit' || type === 'withdrawal')
      const amount = !channelEvent ? balanceChange?.amount : undefined
      const fee = events.find(({ type }) => type === 'fee')?.amount
      const connection = (await db.connections.get(connectionId)) as ConnectionDetails

      let channel: Channel | undefined

      if (channelEvent) {
        channel = await db.channels.get(channelEvent.channel)
      }

      details.push({
        type: 'transaction',
        icon: channelEvent ? channels : bitcoin,
        status: typeof blockheight === 'number' ? 'complete' : 'pending',
        amount,
        fee,
        channelEvent,
        channel,
        connection,
        completedAt: typeof blockheight === 'number' ? events[0].timestamp : undefined,
        abs: balanceChange?.type === 'deposit' ? '+' : '-',
        txid: id
      })
    }

    return details
  })

  let transactionDetailToShow: TransactionDetail | undefined

  $: if ($transactionDetails$) {
    const details = $transactionDetails$
    const completed = details.find(({ status, type }) => status === 'complete')
    const pendingTransaction = details.find(
      ({ type, status }) => type === 'transaction' && status === 'pending'
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
      type,
      icon,
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
      connection,
      offer,
      abs,
      channelEvent,
      channel
    } = transactionDetailToShow}

    {#if qrValues.length}
      <div class="flex flex-col w-full items-center my-4">
        <Qr values={qrValues} />

        {#if expiresAt}
          <ExpiryCountdown on:expired={handlePaymentExpire} expiry={expiresAt} />
        {/if}
      </div>
    {:else}
      <div class="w-full flex justify-center items-center text-3xl font-semibold">
        <div class="w-8 mr-1.5">{@html icon}</div>
        <div>
          {$translate(
            `app.labels.${
              channelEvent
                ? channelEvent.type === 'channelClose'
                  ? 'channel_close'
                  : 'channel_open'
                : type
            }`
          )}
        </div>
      </div>
    {/if}

    {#if amount}
      <div class="flex items-center w-full justify-center text-2xl">
        <div
          class:text-utility-success={abs === '+'}
          class:text-utility-error={abs === '-'}
          class="font-semibold"
        >
          {abs}
        </div>
        <BitcoinAmount msat={amount} />
      </div>
    {/if}

    <div class="w-full flex justify-center mt-2">
      <div class="w-full max-w-lg">
        <!-- CONNECTION -->
        <SummaryRow>
          <span slot="label">{$translate('app.labels.connection')}:</span>
          <a
            href={`/connections/${connection.id}`}
            slot="value"
            class="no-underline flex items-center"
            >{connection.label}
            <div class="w-6 ml-1">{@html link}</div></a
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
            {#if status === 'pending'}
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
              class="flex items-center"
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

        <!-- FEE -->
        {#if fee}
          <SummaryRow>
            <span slot="label">{$translate('app.labels.fee')}:</span>
            <span slot="value">
              <BitcoinAmount msat={fee} />
            </span>
          </SummaryRow>
        {/if}

        <!-- CHANNEL -->
        {#if channel}
          <SummaryRow>
            <span slot="label">{$translate('app.labels.channel_id')}:</span>
            <a slot="value" href={`/channels/${channel.id}`} class="flex items-center">
              {truncateValue(channel.id)}
              <div in:fade|local={{ duration: 250 }} class="w-6 cursor-pointer ml-1">
                {@html link}
              </div>
            </a>
          </SummaryRow>

          <SummaryRow>
            <span slot="label">{$translate('app.labels.channel_peer')}:</span>
            <span slot="value">
              {channel.peerAlias}
            </span>
          </SummaryRow>
        {/if}

        <!-- OFFER -->
        {#if offer}
          {@const { id, issuer, payerNote, description } = offer}
          {#if id}
            <SummaryRow>
              <span slot="label">{$translate('app.labels.offer')}:</span>
              <a slot="value" href={`/offers/${id}`} class="flex items-center">
                {truncateValue(id)}
                <div in:fade|local={{ duration: 250 }} class="w-6 cursor-pointer ml-1">
                  {@html link}
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
                  direction: abs === '+' ? 'receive' : 'send'
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
              {#await formatDate(completedAt) then formatted}
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
