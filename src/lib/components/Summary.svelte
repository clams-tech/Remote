<script lang="ts">
  import { currencySymbols, MIN_IN_SECS } from '$lib/constants'
  import Button from '$lib/elements/Button.svelte'
  import SummaryRow from '$lib/elements/SummaryRow.svelte'
  import { translate } from '$lib/i18n/translations'
  import type { PaymentType } from '$lib/types'
  import { settings$ } from '$lib/streams'
  import { formatCountdown, formatDestination, formatValueForDisplay } from '$lib/utils'
  import { createEventDispatcher } from 'svelte'
  import ExpiryCountdown from './ExpiryCountdown.svelte'
  import Big from 'big.js'
  import Toggle from '$lib/elements/Toggle.svelte'

  export let paymentType: PaymentType
  export let paymentAction: 'create' | 'fulfill'
  export let destination: string | null = ''
  export let issuer: string | null = ''
  export let direction: 'send' | 'receive'
  export let value: string | null
  export let description = ''
  export let expiry: number | null
  export let timestamp: number | null = null
  export let requesting: boolean
  export let quantity: number | undefined = undefined
  export let quantityMax: number | undefined = undefined
  export let payerNote: string | undefined = undefined
  export let singleUse: boolean | undefined = undefined

  if (!value) {
    value = '0'
  }

  $: expiryStep = secondsToStep(expiry)
  $: expirySeconds = stepToSeconds(expiryStep)
  $: expiryDate = new Date(Date.now() + expirySeconds * 1000)

  const expiresAt = timestamp ? (timestamp + (expiry || $settings$.invoiceExpiry)) * 1000 : null
  const dispatch = createEventDispatcher()

  function stepToSeconds(step: number) {
    switch (step) {
      case 0:
        return 0
      // 10 mins
      case 1:
        return 10 * MIN_IN_SECS
      // 1 hour
      case 2:
        return 60 * MIN_IN_SECS
      // 1 day
      case 3:
        return 60 * MIN_IN_SECS * 24
      // 1 week
      case 4:
        return 60 * MIN_IN_SECS * 24 * 7
      default:
        return 10 * MIN_IN_SECS
    }
  }

  function secondsToStep(seconds: number | null) {
    // bolt 12 offers allow for no expiry
    if (!seconds && paymentType === 'bolt12') return 0

    if (!seconds || seconds <= 10 * MIN_IN_SECS) {
      return 1
    }

    if (seconds >= 10 * MIN_IN_SECS && seconds <= 60 * MIN_IN_SECS) {
      return 2
    }

    if (seconds >= 60 * MIN_IN_SECS && seconds <= 60 * MIN_IN_SECS * 24) {
      return 3
    }

    return 4
  }

  function updateExpiry() {
    expiry = expirySeconds

    if (expirySeconds) {
      const currentSettings = settings$.value

      settings$.next({
        ...currentSettings,
        invoiceExpiry: expiry
      })
    }
  }

  const primarySymbol = currencySymbols[$settings$.primaryDenomination]
  const total = quantity && quantity > 1 && Big(value!).mul(quantity).toString()
</script>

<section class="flex flex-col justify-center items-start w-full p-4 max-w-lg pt-20">
  <div class="w-full">
    <div class="mb-6">
      <h1 class="text-4xl font-bold mb-4">
        {$translate('app.headings.summary', { direction, paymentType, paymentAction })}
      </h1>
      <p class="text-neutral-600 dark:text-neutral-400 italic">
        {$translate('app.subheadings.summary', { direction, paymentType, paymentAction })}
      </p>
    </div>

    <!-- DESTINATION -->
    {#if direction === 'send' && destination}
      <SummaryRow>
        <span slot="label">{$translate('app.labels.destination')}:</span>
        <span slot="value">
          {formatDestination(destination, paymentType)}
        </span>
      </SummaryRow>
    {/if}

    <!-- ISSUER -->
    {#if direction === 'receive' && issuer}
      <SummaryRow>
        <span slot="label">{$translate('app.labels.issuer')}:</span>
        <span slot="value">
          {issuer}
        </span>
      </SummaryRow>
    {/if}

    <!-- AMOUNT -->
    <SummaryRow>
      <span slot="label">{$translate('app.labels.amount')}:</span>
      <span class="flex items-center" slot="value">
        {#if value}
          {#if direction === 'receive' && value === '0'}
            {$translate('app.labels.any')}
          {:else}
            <span class="flex items-center justify-center" class:w-4={primarySymbol.startsWith('<')}
              >{@html primarySymbol}</span
            >
            <span
              >{formatValueForDisplay({
                value,
                denomination: $settings$.primaryDenomination,
                commas: true
              })}</span
            >
          {/if}
        {/if}
      </span>
    </SummaryRow>

    <!-- QUANTITY -->
    {#if quantity}
      <SummaryRow>
        <span slot="label">{$translate('app.labels.quantity')}:</span>
        <div class="flex items-center" slot="value">
          <span>
            {quantity}
          </span>
        </div>
      </SummaryRow>

      {#if total}
        <SummaryRow>
          <span slot="label">{$translate('app.labels.total')}:</span>
          <div class="flex items-center" slot="value">
            <span class="flex items-center justify-center" class:w-4={primarySymbol.startsWith('<')}
              >{@html primarySymbol}</span
            >
            <span
              >{formatValueForDisplay({
                value: total,
                denomination: $settings$.primaryDenomination,
                commas: true
              })}</span
            >
          </div>
        </SummaryRow>
      {/if}
    {/if}

    <!-- MAX QUANTITY -->
    {#if quantityMax}
      <SummaryRow>
        <span slot="label">{$translate('app.labels.max_quantity')}:</span>
        <div class="flex items-center" slot="value">
          <span>
            {quantityMax}
          </span>
        </div>
      </SummaryRow>
    {/if}

    <!-- DESCRIPTION -->
    <SummaryRow>
      <span slot="label">{$translate('app.labels.description')}:</span>
      <span slot="value">
        {description || 'none'}
      </span>
    </SummaryRow>

    <!-- PAYER NOTE -->
    {#if payerNote}
      <SummaryRow>
        <span slot="label">{$translate('app.labels.payer_note')}:</span>
        <span slot="value">
          {payerNote}
        </span>
      </SummaryRow>
    {/if}

    <!-- EXPIRY -->
    {#if expiry}
      <SummaryRow>
        <span slot="label">{$translate('app.labels.expires')}:</span>
        <span class="flex items-center w-full justify-end" slot="value">
          {#if direction === 'receive' || paymentAction === 'create'}
            <input
              class="h-2 bg-purple-50 appearance-none mr-4 accent-purple-500 dark:accent-purple-300"
              type="range"
              min={paymentType === 'bolt12' ? 0 : 1}
              max="4"
              step="1"
              bind:value={expiryStep}
              on:change={updateExpiry}
            />
            <span class="whitespace-nowrap w-24 text-right">
              {#if expirySeconds === 0}
                {$translate('app.labels.never')}
              {:else}
                {#await formatCountdown( { date: expiryDate, language: $settings$.language } ) then countdown}
                  {countdown}
                {/await}
              {/if}
            </span>
          {:else if expiresAt}
            <ExpiryCountdown small={false} label={false} expiry={new Date(expiresAt)} />
          {/if}
        </span>
      </SummaryRow>
    {/if}

    <!-- SINGLE USE -->
    {#if singleUse !== undefined}
      <div class="cursor-pointer">
        <SummaryRow on:click={() => (singleUse = !singleUse)}>
          <span slot="label">{$translate('app.labels.single_use')}:</span>
          <div class="font-bold" slot="value">
            <Toggle bind:toggled={singleUse} />
          </div>
        </SummaryRow>
      </div>
    {/if}
  </div>

  <div class="mt-6 w-full">
    <Button
      {requesting}
      primary
      disabled={!!(expiresAt && Date.now() >= expiresAt)}
      text={$translate('app.buttons.summary_complete', { paymentType, direction, paymentAction })}
      on:click={() => dispatch('complete')}
    />
  </div>
</section>
