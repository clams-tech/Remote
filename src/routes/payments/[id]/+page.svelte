<script lang="ts">
  import type { Wallet } from '$lib/@types/wallets.js'
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
    type ChannelTransactionSummary,
    getPaymentSummary
  } from '$lib/summary.js'
  import type {
    AddressPayment,
    InvoicePayment,
    Network,
    Payment,
    PaymentStatus,
    TransactionPayment
  } from '$lib/@types/payments.js'

  export let data: PageData

  const { id, walletId } = data

  type QRValue = { label: string; value: string }

  type PaymentDetails = {
    payment: Payment
    summary: PaymentSummary | null
    wallet: Wallet
    qrValues: QRValue[]
  } | null

  const paymentDetails$: Observable<PaymentDetails> = from(
    liveQuery(async () => {
      return db.transaction(
        'r',
        db.payments,
        db.wallets,
        db.channels,
        db.withdrawals,
        db.deposits,
        db.contacts,
        // @ts-ignore
        db.utxos,
        db.offers,
        db.nodes,
        async (): Promise<PaymentDetails> => {
          const payment = await db.payments.where({ id, walletId }).first()
          if (!payment || !walletId) return null

          const wallet = (await db.wallets.get(walletId)) as Wallet
          const summary = await getPaymentSummary(payment)
          const qrValues: QRValue[] = []

          if (payment.status === 'waiting') {
            if (payment.type === 'invoice') {
              const {
                data: { request, fallbackAddress, amount, description, offer }
              } = payment

              if (request) {
                qrValues.push({
                  label: $translate('app.labels.invoice'),
                  value: `lightning:${request.toUpperCase()}`
                })
              }

              if (fallbackAddress) {
                const searchParams = new URLSearchParams()

                if (amount && amount !== 0) {
                  searchParams.append('amount', satsToBtcString(amount))
                }

                if (description) {
                  searchParams.append('message', description)
                }

                qrValues.push({
                  label: $translate('app.labels.address'),
                  value: `bitcoin:${id.toUpperCase()}${
                    Array.from(searchParams.keys()).length ? `?${searchParams.toString()}` : ''
                  }`
                })
              }

              const withdrawalOfferId = offer ? await tryFindWithdrawalOfferId(offer) : undefined

              const formattedOffer =
                offer && withdrawalOfferId ? { id: withdrawalOfferId, ...offer } : offer

              payment.data.offer = formattedOffer
            }

            if (payment.type === 'address') {
              const {
                data: { amount, message, label }
              } = payment

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

              qrValues.push({
                label: $translate('app.labels.address'),
                value: `bitcoin:${id.toUpperCase()}${
                  Array.from(searchParams.keys()).length ? `?${searchParams.toString()}` : ''
                }`
              })
            }
          }

          return { wallet, summary, payment, qrValues }
        }
      ) as Promise<PaymentDetails>
    })
  )

  const handlePaymentExpire = async () => {
    await db.payments.where({ id }).modify({ status: 'expired' })
  }

  const tryFindWithdrawalOfferId = async (offerDetails: InvoicePayment['data']['offer']) => {
    const { description, issuer } = offerDetails!
    if (!issuer) return undefined
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

  $: enhancedInputs = ($paymentDetails$?.summary as RegularTransactionSummary).inputs
  $: enhancedOutputs = ($paymentDetails$?.summary as RegularTransactionSummary).outputs
  $: transactionChannels = ($paymentDetails$?.summary as ChannelTransactionSummary).channels
</script>

<svelte:head>
  <title>{$translate('app.routes./payment.title')}</title>
</svelte:head>

<Section>
  {#if $paymentDetails$ === undefined}
    <div class="mt-4">
      <Spinner />
    </div>
  {:else if $paymentDetails$ === null}
    <SectionHeading text={$translate('app.labels.payment')} />
    <div class="mt-4">
      <Msg type="error" closable={false} message={$translate('app.errors.payment_not_found')} />
    </div>
  {:else}
    {@const { payment, summary, wallet, qrValues } = $paymentDetails$}

    {@const { status, network, data, type } = payment}

    {#if summary}
      {@const { primary, secondary, type, timestamp } = summary}
      <div class="w-full flex justify-center items-center text-3xl font-semibold text-center">
        <Summary {primary} {secondary} {type} {network} {status} {timestamp} centered />
      </div>
    {/if}

    {#if qrValues.length}
      <div class="flex flex-col w-full items-center my-4">
        <Qr values={qrValues} />

        {#if type === 'invoice' && data.expiresAt}
          <ExpiryCountdown on:expired={handlePaymentExpire} expiry={data.expiresAt} />
        {/if}
      </div>
    {/if}

    <div class="w-full flex justify-center mt-2">
      <div class="w-full">
        {#if type !== 'transaction' && typeof data.amount === 'number'}
          <SummaryRow>
            <span slot="label">{$translate('app.labels.amount')}:</span>
            <div slot="value">
              {#if data.amount === 0}
                <div>{$translate('app.labels.any_amount')}</div>
              {:else}
                <BitcoinAmount sats={data.amount} />
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

        {#if type === 'transaction'}
          <SummaryRow>
            <span slot="label">{$translate('app.labels.txid')}:</span>
            <div slot="value">
              {#if network === 'regtest'}
                {truncateValue(id)}
              {:else}
                <a
                  href={`https://mempool.space/${
                    network !== 'bitcoin' ? `${network}/` : ''
                  }tx/${id}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  class="flex items-center no-underline"
                >
                  {truncateValue(id)}
                  <div in:fade|local={{ duration: 250 }} class="w-6 cursor-pointer ml-1">
                    {@html link}
                  </div>
                </a>
              {/if}
            </div>
          </SummaryRow>
        {/if}

        {#if type === 'invoice' && data.description && !data.offer?.description}
          <SummaryRow baseline>
            <span slot="label">{$translate('app.labels.description')}:</span>
            <span slot="value" class="w-full">{data.description}</span>
          </SummaryRow>
        {/if}

        {#if enhancedInputs}
          <SummaryRow baseline>
            <span slot="label">{$translate('app.labels.inputs')}:</span>
            <div class="gap-y-1 flex flex-col text-sm" slot="value">
              {#each enhancedInputs as input}
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

        {#if enhancedOutputs}
          <SummaryRow baseline>
            <span slot="label">{$translate('app.labels.outputs')}:</span>
            <div class="gap-y-1 flex flex-col justify-center items-center text-sm" slot="value">
              {#each enhancedOutputs as output}
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
                          <CopyValue value={address.toUpperCase()} truncateLength={8} />
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

        {#if type === 'invoice' && data.fee}
          <SummaryRow>
            <span slot="label"
              >{$translate(
                `app.labels.${
                  (summary?.type === 'channel_close' || summary?.type === 'channel_force_close') &&
                  data.fee < 1
                    ? 'lost_to_rounding'
                    : 'fee'
                }`
              )}:</span
            >
            <div class="flex items-center" slot="value">
              <BitcoinAmount sats={data.fee} />
            </div>
          </SummaryRow>
        {/if}

        {#if type === 'transaction' && data.blockHeight}
          <SummaryRow>
            <span slot="label">{$translate('app.labels.included_in_block')}:</span>
            <div slot="value">
              {data.blockHeight}
            </div>
          </SummaryRow>
        {/if}

        {#if transactionChannels?.length}
          {@const [channel] = transactionChannels}
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

          <!-- @TODO - Could add back in to show blocks until sweepable, but needs to be reliable -->
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

        {#if type === 'invoice' && data.offer}
          {@const { id, issuer, payerNote, description } = data.offer}

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
                  direction: summary?.category === 'income' ? 'receive' : 'send'
                })}:</span
              >
              <span slot="value">{payerNote}</span>
            </SummaryRow>
          {/if}
        {/if}

        {#if type === 'invoice' || type === 'address'}
          {#if data.completedAt}
            <SummaryRow>
              <span slot="label">{$translate('app.labels.completed_at')}:</span>
              <span slot="value">
                {#await formatDate(data.completedAt, 'h:mmaaa - EEEE do LLL') then formatted}
                  <span in:fade|local={{ duration: 50 }}>{formatted}</span>
                {/await}
              </span>
            </SummaryRow>
          {:else if data.createdAt}
            <SummaryRow>
              <span slot="label">{$translate('app.labels.created_at')}:</span>
              <span slot="value">
                {#await formatDate(data.createdAt) then formatted}
                  <span in:fade|local={{ duration: 50 }}>{formatted}</span>
                {/await}
              </span>
            </SummaryRow>
          {/if}
        {/if}

        {#if type === 'invoice' && data.counterpartyNode}
          <SummaryRow>
            <span slot="label">{$translate('app.labels.destination')}:</span>
            <div slot="value">
              <CopyValue value={data.counterpartyNode} truncateLength={9} />
            </div>
          </SummaryRow>
        {/if}

        {#if type === 'invoice'}
          <SummaryRow>
            <span slot="label">{$translate('app.labels.hash')}:</span>
            <div slot="value">
              <CopyValue value={id} truncateLength={9} />
            </div>
          </SummaryRow>

          {#if data.preimage}
            <SummaryRow>
              <span slot="label">{$translate('app.labels.preimage')}:</span>
              <div slot="value">
                <CopyValue value={data.preimage} truncateLength={9} />
              </div>
            </SummaryRow>
          {/if}
        {/if}
      </div>
    </div>
  {/if}
</Section>
