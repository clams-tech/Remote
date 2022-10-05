<script lang="ts">
  import { onDestroy } from 'svelte'
  import { fade } from 'svelte/transition'
  import Qr from '$lib/components/QR.svelte'
  import ExpiryCountdown from '$lib/components/ExpiryCountdown.svelte'
  import type { Payment } from '$lib/types'
  import { BitcoinDenomination } from '$lib/types'
  import { bitcoinExchangeRates$, paymentUpdates$, settings$ } from '$lib/streams'
  import { translate } from '$lib/i18n/translations'
  import SummaryRow from '$lib/elements/SummaryRow.svelte'
  import Spinner from '$lib/elements/Spinner.svelte'
  import Copy from '$lib/icons/Copy.svelte'
  import Check from '$lib/icons/Check.svelte'
  import Warning from '$lib/icons/Warning.svelte'
  import { convertValue } from '$lib/conversion'
  import { formatDate, formatValueForDisplay, truncateValue, writeClipboardValue } from '$lib/utils'

  export let payment: Payment

  const { primaryDenomination, secondaryDenomination } = settings$.value

  $: statusColor =
    payment.status === 'complete'
      ? 'success'
      : payment.status === 'expired' || payment.status === 'failed'
      ? 'error'
      : 'pending'

  $: primaryValue =
    $bitcoinExchangeRates$ &&
    convertValue({
      value: payment.value,
      from: BitcoinDenomination.msats,
      to: primaryDenomination
    })

  $: secondaryValue =
    $bitcoinExchangeRates$ &&
    convertValue({
      value: payment.value,
      from: BitcoinDenomination.msats,
      to: secondaryDenomination
    })

  let copySuccess: string
  let successTimeoutId: NodeJS.Timeout

  function handleCopy(value: string) {
    return async () => {
      const success = await writeClipboardValue(value)

      if (success) {
        copySuccess = value

        successTimeoutId = setTimeout(() => {
          if (copySuccess === value) {
            copySuccess = ''
          }
        }, 2000)
      }
    }
  }

  onDestroy(() => {
    successTimeoutId && clearTimeout(successTimeoutId)
  })

  function handlePaymentExpire() {
    paymentUpdates$.next({ ...payment, status: 'expired' })
  }

  $: abs = payment.direction === 'receive' ? (payment.status === 'expired' ? '' : '+') : '-'

  // text-utility-success
  // text-utility-pending
  // text-utility-error
</script>

<div class="w-full flex flex-col px-8 pt-12 pb-4 max-h-screen overflow-auto">
  <!-- AMOUNT -->
  <div class="flex flex-col items-center justify-center">
    <span
      >{$translate('app.payment.status', {
        status: payment.status,
        direction: payment.direction
      })}</span
    >
    {#if primaryValue}
      <div in:fade class="flex flex-col items-end">
        <span
          class="text-3xl tracking-wider {payment.direction === 'receive' &&
          payment.status === 'complete'
            ? 'text-utility-success'
            : 'text-current'}"
          >{abs}{formatValueForDisplay({
            value: primaryValue,
            denomination: primaryDenomination,
            commas: true
          })}
          {primaryDenomination}</span
        >
        <span class="text-neutral-600 dark:text-neutral-400"
          >{abs}{formatValueForDisplay({
            value: secondaryValue || '0',
            denomination: secondaryDenomination,
            commas: true
          })}
          {secondaryDenomination}</span
        >
      </div>
    {:else}
      <Spinner />
    {/if}
  </div>

  <!-- QR AND EXPIRY COUNTDOWN -->
  {#if payment.direction === 'receive' && payment.status === 'pending'}
    <div class="my-4 flex flex-col items-center justify-center">
      <Qr value={payment.bolt11} />
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
    {#if payment.bolt11}
      <SummaryRow on:click={handleCopy(payment.bolt11)}>
        <span slot="label">{$translate('app.labels.invoice')}</span>
        <span class="flex items-center cursor-pointer" slot="value">
          {truncateValue(payment.bolt11)}
          {#if copySuccess === payment.bolt11}
            <div in:fade class="w-6 text-utility-success">
              <Check />
            </div>
          {:else}
            <div in:fade class="w-6 cursor-pointer">
              <Copy />
            </div>
          {/if}
        </span>
      </SummaryRow>
      <!-- DESTINATION -->
    {:else if payment.destination}
      <SummaryRow on:click={handleCopy(payment.destination)}>
        <span slot="label">{$translate('app.labels.destination')}</span>
        <span slot="value" class="flex items-center">
          {payment.destination.length > 30
            ? truncateValue(payment.destination)
            : payment.destination}
          {#if copySuccess === payment.destination}
            <div in:fade class="w-6 text-utility-success">
              <Check />
            </div>
          {:else}
            <div in:fade class="w-6 cursor-pointer">
              <Copy />
            </div>
          {/if}
        </span>
      </SummaryRow>
    {/if}

    <!-- STATUS -->
    <SummaryRow>
      <span slot="label">{$translate('app.labels.status')}</span>
      <span class="text-utility-{statusColor} flex items-center" slot="value">
        {payment.status}
        {#if payment.status === 'pending'}
          <div class="ml-1">
            <Spinner size="1rem" />
          </div>
        {/if}

        {#if payment.status === 'complete'}
          <div class="w-4 ml-1 border border-utility-success rounded-full">
            <Check />
          </div>
        {/if}

        {#if payment.status === 'expired' || payment.status == 'failed'}
          <div class="w-4 ml-1">
            <Warning />
          </div>
        {/if}
      </span>
    </SummaryRow>

    <!-- TIMESTAMP -->
    {#if payment.completedAt}
      <SummaryRow>
        <span slot="label">{$translate('app.labels.completed_at')}</span>
        <span slot="value"
          >{formatDate({ date: payment.completedAt, language: $settings$.language })}</span
        >
      </SummaryRow>
    {:else}
      <SummaryRow>
        <span slot="label"
          >{$translate('app.labels.created_started_at', { direction: payment.direction })}</span
        >
        <span slot="value"
          >{formatDate({ date: payment.startedAt, language: $settings$.language })}</span
        >
      </SummaryRow>
    {/if}

    <!-- DESCRIPTION -->
    {#if payment.description}
      <SummaryRow>
        <span slot="label">{$translate('app.labels.description')}</span>
        <span slot="value">{payment.description}</span>
      </SummaryRow>
    {/if}

    <!-- PAYMENT HASH -->
    {#if payment.hash}
      <SummaryRow on:click={handleCopy(payment.hash)}>
        <span slot="label">{$translate('app.labels.payment_id')}</span>
        <span class="flex items-center" slot="value">
          {truncateValue(payment.hash)}
          {#if copySuccess === payment.hash}
            <div in:fade class="w-6 text-utility-success">
              <Check />
            </div>
          {:else}
            <div in:fade class="w-6 cursor-pointer">
              <Copy />
            </div>
          {/if}
        </span>
      </SummaryRow>
    {/if}

    <!-- FEES -->
    {#if payment.fee}
      <SummaryRow>
        <span slot="label">{$translate('app.labels.fee', { feeType: 'network' })}</span>
        <span class="flex items-center" slot="value">
          {formatValueForDisplay({
            value: convertValue({
              value: payment.fee,
              from: BitcoinDenomination.msats,
              to: primaryDenomination
            }),
            denomination: primaryDenomination
          })}
        </span>
      </SummaryRow>
    {/if}
  </div>
</div>
