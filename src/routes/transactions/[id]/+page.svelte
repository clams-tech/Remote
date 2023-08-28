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
  import { truncateValue } from '$lib/utils.js'
  import link from '$lib/icons/link.js'
  import { liveQuery } from 'dexie'
  import caret from '$lib/icons/caret.js'
  import type { Utxo } from '$lib/@types/utxos.js'
  import type { Metadata } from '$lib/@types/metadata.js'
  import { satsToBtcString } from '$lib/conversion.js'
  import { deriveInvoiceMovement, deriveTransactionMovement } from '$lib/movement.js'
  import type { Movement } from '$lib/@types/movement.js'

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
    balanceChange: Movement['balanceChange']
    fee?: number
    description?: string
    createdAt?: number
    completedAt?: number
    expiresAt?: number
    peerNodeId?: string
    wallet: Wallet
    category: Movement['category']
    from: Movement['from']
    to: Movement['to']
    offer?: Invoice['offer']
    channel?: Transaction['channel']
    inputs?: { outpoint: string; utxo?: Utxo }[]
    outputs?: {
      amount: number
      outpoint: string
      address: string
      labelKey?: string
      utxo?: Utxo
    }[]
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
      const movement = deriveInvoiceMovement(invoice)

      details.push({
        type: 'invoice',
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
        balanceChange: movement.balanceChange,
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
        category: movement.category,
        from: movement.from,
        to: movement.to
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

      if (invoice && invoice.status === 'pending') {
        searchParams.append('lightning', invoice.request.toUpperCase())

        qrValues.push({
          label: $translate('app.labels.unified'),
          value: `bitcoin:${value.toUpperCase()}${
            Array.from(searchParams.keys()).length ? `?${searchParams.toString()}` : ''
          }`
        })
      }

      details.push({
        type: 'address',
        qrValues,
        status,
        balanceChange: amount,
        description: message,
        createdAt,
        completedAt,
        wallet,
        channel: tx?.channel,
        txid,
        category: 'income',
        to: walletId,
        from: undefined
      })
    }

    if (transaction) {
      const { id, walletId, fee, blockheight, inputs, outputs, channel, timestamp } = transaction

      const wallet = (await db.wallets.get(walletId)) as Wallet
      const movement = await deriveTransactionMovement(transaction)

      const formattedInputs = await Promise.all(
        inputs.map(async ({ index, txid }) => {
          const outpoint = `${txid}:${index}`
          const utxo = await db.utxos.get(outpoint)
          return { outpoint, utxo }
        })
      )

      const formattedOutputs = await Promise.all(
        outputs.map(async ({ index, amount, address }) => {
          const outpoint = `${id}:${index}`
          const utxo = await db.utxos.get(outpoint)
          const inputUtxos = formattedInputs.filter(({ utxo }) => !!utxo)

          let labelKey: string | undefined = undefined

          // we own this output
          if (utxo) {
            // no owned inputs, so must be a receive
            if (!inputUtxos.length) {
              labelKey = 'receive'
            } else {
              const inputUtxoWithSamewallet = inputUtxos.find(
                (input) => input.utxo?.walletId === utxo?.walletId
              )
              // input has the same wallet as this output, so is change
              if (inputUtxoWithSamewallet) {
                labelKey = 'change'
              }
              // otherwise sent from different wallet, so is transfer
              else {
                labelKey = 'transfer'
              }
            }
          }
          // unknown output so must be send if we own at least one of the inputs
          else {
            if (inputUtxos.length) {
              labelKey = 'send'
            }
          }

          return {
            amount,
            outpoint,
            address,
            utxo,
            labelKey
          }
        })
      )

      details.push({
        type: 'onchain',
        status: typeof blockheight === 'number' ? 'complete' : 'pending',
        balanceChange: movement.balanceChange,
        fee,
        channel,
        wallet,
        completedAt: typeof blockheight === 'number' ? timestamp : undefined,
        txid: id,
        inputs: formattedInputs,
        outputs: formattedOutputs,
        category: movement.category,
        from: movement.from,
        to: movement.to
      })
    }

    return details
  })

  let transactionDetailToShow: TransactionDetail | undefined

  $: if ($transactionDetails$) {
    const details = $transactionDetails$
    const completed = details.find(({ status, type }) => status === 'complete')
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
      status,
      paymentHash,
      paymentPreimage,
      txid,
      balanceChange,
      request,
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
      from,
      to
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
        <div>
          {$translate(
            `app.labels.${
              channel
                ? channel.type === 'close'
                  ? 'channel_close'
                  : 'channel_open'
                : type === 'invoice' && !request
                ? 'keysend'
                : type
            }`
          )}
        </div>
      </div>
    {/if}

    {#if balanceChange}
      <div class="flex items-center w-full justify-center text-2xl">
        <div
          class:text-utility-success={category === 'income'}
          class:text-utility-error={category === 'expense'}
          class="font-semibold"
        >
          {category === 'income' ? '+' : category === 'expense' ? '-' : ''}
        </div>

        <BitcoinAmount sats={balanceChange} />
      </div>
    {/if}

    <div class="w-full flex justify-center mt-2">
      <div class="w-full max-w-lg">
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
              {#each inputs as { outpoint, utxo }}
                <div
                  class="flex items-center w-full rounded-full bg-neutral-800 hover:bg-neutral-900 transition-colors py-1 px-4"
                >
                  {#if utxo}
                    <a class="no-underline" href={`/utxos/${outpoint}`}>
                      <div class="text-xs flex items-center">
                        <div class="text-utility-error mr-1">
                          {$translate('app.labels.spent')}:
                        </div>
                        <div>
                          {#await db.wallets.get(utxo.walletId) then wallet}
                            {wallet?.label}
                          {/await}
                        </div>
                      </div>

                      <BitcoinAmount sats={utxo.amount} />
                    </a>
                    <div class="w-4 ml-1 -mr-2 -rotate-90">{@html caret}</div>
                  {:else}
                    {truncateValue(outpoint)}
                  {/if}
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
              {#each outputs as { outpoint, utxo, amount, address, labelKey }}
                <div
                  class="flex items-center w-full rounded-full bg-neutral-800 hover:bg-neutral-900 transition-colors py-1 px-4"
                >
                  {#if utxo}
                    <a class="no-underline" href={`/utxos/${outpoint}`}>
                      <div class="text-xs flex items-center">
                        {#if labelKey}
                          <div class="text-utility-success mr-1">
                            {$translate(`app.labels.${labelKey}`)}:
                          </div>
                        {/if}
                        <div>
                          {#await db.wallets.get(utxo.walletId) then wallet}
                            {wallet?.label}
                          {/await}
                        </div>
                      </div>
                      <BitcoinAmount sats={utxo.amount} />
                    </a>
                    <div class="w-4 ml-1 -mr-2 -rotate-90">{@html caret}</div>
                  {:else}
                    <div>
                      <div class="text-xs flex items-center">
                        {#if labelKey}
                          <div class="text-utility-error mr-1">
                            {$translate(`app.labels.${labelKey}`)}:
                          </div>
                        {/if}
                        <div>
                          {truncateValue(address, 6)}
                        </div>
                      </div>
                      <BitcoinAmount sats={amount} />
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </SummaryRow>
        {/if}

        <!-- FEE -->
        {#if fee}
          <SummaryRow>
            <span slot="label">{$translate('app.labels.fee')}:</span>
            <div class="flex items-center" slot="value">
              <div class="font-semibold text-utility-error mr-1">-</div>
              <BitcoinAmount sats={fee} />
            </div>
          </SummaryRow>
        {/if}

        <!-- CHANNEL -->
        {#if channel}
          <SummaryRow>
            <span slot="label">{$translate('app.labels.channel_id')}:</span>
            <a slot="value" href={`/channels/${channel.channelId}`} class="flex items-center">
              {truncateValue(channel.channelId)}
              <div in:fade|local={{ duration: 250 }} class="w-6 cursor-pointer ml-1 -rotate-90">
                {@html caret}
              </div>
            </a>
          </SummaryRow>

          {#await db.channels.get(channel.channelId) then channelDetails}
            {#if channelDetails}
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
