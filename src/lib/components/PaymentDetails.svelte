<script lang="ts">
  import { fade } from 'svelte/transition'
  import Qr from '$lib/components/QR.svelte'
  import ExpiryCountdown from '$lib/components/ExpiryCountdown.svelte'
  import type { FormattedDecodedOffer, Payment } from '$lib/types'
  import { BitcoinDenomination } from '$lib/types'
  import { offers$, paymentUpdates$, settings$ } from '$lib/streams'
  import { translate } from '$lib/i18n/translations'
  import SummaryRow from '$lib/elements/SummaryRow.svelte'
  import Spinner from '$lib/elements/Spinner.svelte'
  import { convertValue } from '$lib/conversion'
  import { formatDate, formatValueForDisplay, truncateValue } from '$lib/utils'
  import check from '$lib/icons/check'
  import warning from '$lib/icons/warning'
  import { currencySymbols } from '$lib/constants'
  import link from '$lib/icons/link'
  import { goto } from '$app/navigation'
  import CopyValue from '$lib/elements/CopyValue.svelte'
  import type { FormattedOfferSummary } from '$lib/backends'

  export let payment: Payment

  $: statusColor =
    payment.status === 'complete'
      ? 'success'
      : payment.status === 'expired' || payment.status === 'failed'
      ? 'error'
      : 'pending'

  $: primaryValue = convertValue({
    value: payment.value,
    from: BitcoinDenomination.msats,
    to: $settings$.primaryDenomination
  })

  $: secondaryValue = convertValue({
    value: payment.value,
    from: BitcoinDenomination.msats,
    to: $settings$.secondaryDenomination
  })

  function handlePaymentExpire() {
    paymentUpdates$.next({ ...payment, status: 'expired' })
  }

  $: abs = payment.direction === 'receive' ? (payment.status === 'expired' ? '' : '+') : '-'
  $: primarySymbol = currencySymbols[$settings$.primaryDenomination]
  $: secondarySymbol = currencySymbols[$settings$.secondaryDenomination]

  $: withdrawalOfferId = tryFindOffer($offers$.data)

  // try and find withdrawal offer id since we can't decode it from the bolt12
  function tryFindOffer(offers: (FormattedDecodedOffer & FormattedOfferSummary)[] | null): string {
    if (!offers || payment.direction === 'receive' || !payment.offer || payment.offer.id) return ''
    const { offer: paymentOffer } = payment

    const offer = offers.find(({ offerType, description, issuer }) => {
      return (
        offerType === 'bolt12 invoice_request' &&
        description === paymentOffer.description &&
        issuer === paymentOffer.issuer
      )
    })

    return offer ? offer.id : ''
  }
</script>

<div class="w-full flex flex-col px-4 pb-4 max-h-screen overflow-auto">
  <!-- AMOUNT -->
  <div class="flex flex-col items-center justify-center">
    <span
      >{$translate('app.payment.status', {
        status: payment.status,
        direction: payment.direction
      })}</span
    >
    <div in:fade|local class="flex flex-col items-end">
      <span
        class="text-4xl flex items-center tracking-wider {payment.direction === 'receive' &&
        payment.status === 'complete'
          ? 'text-utility-success'
          : 'text-current'}"
      >
        <span class="mr-1">{abs}</span>

        {#if primaryValue !== '0' && primaryValue !== 'any'}
          <span
            class="flex justify-center items-center"
            class:w-9={primarySymbol.startsWith('<')}
            class:mr-[2px]={!primarySymbol.startsWith('<')}>{@html primarySymbol}</span
          >
        {/if}

        {#if primaryValue !== null}
          {primaryValue === '0' || primaryValue === 'any'
            ? $translate('app.labels.any')
            : formatValueForDisplay({
                value: primaryValue,
                denomination: $settings$.primaryDenomination,
                commas: true
              })}
        {:else}
          <div class="ml-1">
            <Spinner size="2rem" />
          </div>
        {/if}
      </span>

      {#if primaryValue !== '0' && primaryValue !== 'any'}
        <span class="text-neutral-600 dark:text-neutral-400 flex items-center"
          >{abs}<span
            class="flex justify-center items-center"
            class:w-4={secondarySymbol.startsWith('<')}
            class:mr-[2px]={!secondarySymbol.startsWith('<')}>{@html secondarySymbol}</span
          >
          {#if secondaryValue !== null}
            {primaryValue === '0' || primaryValue === 'any'
              ? $translate('app.labels.any')
              : formatValueForDisplay({
                  value: secondaryValue || '0',
                  denomination: $settings$.secondaryDenomination,
                  commas: true
                })}
          {:else}
            <div class="ml-1">
              <Spinner size="1rem" />
            </div>
          {/if}
        </span>
      {/if}
    </div>
  </div>

  <!-- QR AND EXPIRY COUNTDOWN -->
  {#if payment.direction === 'receive' && payment.status === 'pending'}
    <div class="my-4 flex flex-col items-center justify-center">
      <Qr value={payment.invoice || null} />
      {#if payment.expiresAt}
        <div class="mt-2">
          <ExpiryCountdown on:expired={handlePaymentExpire} expiry={new Date(payment.expiresAt)} />
        </div>
      {/if}
    </div>
  {/if}

  <!--------------- DETAILS ----------------------->
  <div class="mt-8">
    <!-- INVOICE -->
    {#if payment.invoice}
      <SummaryRow>
        <span slot="label">{$translate('app.labels.invoice')}:</span>
        <div slot="value">
          <CopyValue value={payment.invoice} truncateLength={9} />
        </div>
      </SummaryRow>

      <!-- OFFER -->
      {#if payment.offer}
        {@const { id, issuer, payerNote, description } = payment.offer}
        {#if issuer}
          <SummaryRow>
            <span slot="label">{$translate('app.labels.issuer')}:</span>
            <div slot="value">
              {issuer}
            </div>
          </SummaryRow>
        {/if}

        {#if id || withdrawalOfferId}
          <SummaryRow>
            <span slot="label">{$translate('app.labels.offer')}:</span>
            <div slot="value">
              <button
                class="flex items-center"
                on:click={() => goto(`/offers/${id || withdrawalOfferId}`)}
              >
                {truncateValue(id || withdrawalOfferId)}
                <div in:fade|local class="w-6 cursor-pointer ml-1">
                  {@html link}
                </div>
              </button>
            </div>
          </SummaryRow>
        {/if}

        {#if payerNote}
          <SummaryRow>
            <span slot="label">{$translate('app.labels.payer_note')}:</span>
            <span slot="value">{payerNote}</span>
          </SummaryRow>
        {/if}

        {#if description}
          <SummaryRow>
            <span slot="label">{$translate('app.labels.offer_description')}:</span>
            <span slot="value">{description}</span>
          </SummaryRow>
        {/if}
      {/if}

      <!-- DESTINATION -->
    {:else if payment.destination}
      <SummaryRow>
        <span slot="label">{$translate('app.labels.destination')}:</span>
        <div slot="value">
          <CopyValue value={payment.destination} truncateLength={9} />
        </div>
      </SummaryRow>
    {/if}

    <!-- DESCRIPTION -->
    {#if payment.description}
      <SummaryRow>
        <span slot="label">{$translate('app.labels.description')}:</span>
        <span slot="value">{payment.description}</span>
      </SummaryRow>
    {/if}

    <!-- STATUS -->
    <SummaryRow>
      <span slot="label">{$translate('app.labels.status')}:</span>
      <span class="text-utility-{statusColor} flex items-center" slot="value">
        {payment.status}
        {#if payment.status === 'pending'}
          <div class="ml-1">
            <Spinner size="1rem" />
          </div>
        {/if}

        {#if payment.status === 'complete'}
          <div class="w-4 ml-1 border border-utility-success rounded-full">
            {@html check}
          </div>
        {/if}

        {#if payment.status === 'expired' || payment.status == 'failed'}
          <div class="w-4 ml-1">
            {@html warning}
          </div>
        {/if}
      </span>
    </SummaryRow>

    <!-- TIMESTAMP -->
    {#if payment.completedAt}
      <SummaryRow>
        <span slot="label">{$translate('app.labels.completed_at')}:</span>
        <span slot="value">
          {#await formatDate( { date: payment.completedAt, language: $settings$.language } ) then formatted}
            <span in:fade|local={{ duration: 50 }}>{formatted}</span>
          {/await}
        </span>
      </SummaryRow>
    {:else}
      <SummaryRow>
        <span slot="label"
          >{$translate('app.labels.created_started_at', { direction: payment.direction })}:</span
        >
        <span slot="value">
          {#await formatDate( { date: payment.startedAt, language: $settings$.language } ) then formatted}
            <span in:fade|local={{ duration: 50 }}>{formatted}</span>
          {/await}
        </span>
      </SummaryRow>
    {/if}

    <!-- PAYMENT HASH -->
    {#if payment.hash}
      <SummaryRow>
        <span slot="label">{$translate('app.labels.hash')}:</span>
        <div slot="value">
          <CopyValue value={payment.hash} truncateLength={9} />
        </div>
      </SummaryRow>
    {/if}

    <!-- FEES -->
    {#if payment.direction === 'send' && payment.fee}
      <SummaryRow>
        <span slot="label">{$translate('app.labels.fee', { feeType: 'network' })}:</span>
        <span class="flex items-center" slot="value">
          <span class="flex items-center justify-center" class:w-4={primarySymbol.startsWith('<')}
            >{@html primarySymbol}</span
          >
          {formatValueForDisplay({
            value: convertValue({
              value: payment.fee,
              from: BitcoinDenomination.msats,
              to: $settings$.primaryDenomination
            }),
            denomination: $settings$.primaryDenomination
          })}
        </span>
      </SummaryRow>
    {/if}
  </div>
</div>
