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

  export let type: PaymentType | null
  export let destination: string | null = ''
  export let issuer: string | null = ''
  export let direction: 'send' | 'receive'
  export let value: string | null
  export let description = ''
  export let expiry: number | null = 600
  export let timestamp: number | null = null
  export let requesting: boolean

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
    if (!seconds) return 3

    if (seconds <= 10 * MIN_IN_SECS) {
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

    const currentSettings = settings$.value

    settings$.next({
      ...currentSettings,
      invoiceExpiry: expiry
    })
  }

  const primarySymbol = currencySymbols[$settings$.primaryDenomination]
</script>

<section class="flex flex-col justify-center items-start w-full p-6 max-w-lg">
  <div class="w-full">
    <div class="mb-6">
      <h1 class="text-4xl font-bold mb-4">{$translate('app.headings.summary', { direction })}</h1>
      <p class="text-neutral-600 dark:text-neutral-400 italic">
        {$translate('app.subheadings.summary')}
      </p>
    </div>

    <!-- DESTINATION -->
    {#if direction === 'send' && destination}
      <SummaryRow>
        <span slot="label">{$translate('app.labels.destination')}:</span>
        <span slot="value">
          {#if type}
            {formatDestination(destination, type)}
          {/if}
        </span>
      </SummaryRow>
    {/if}

    <!-- ISSUER -->
    {#if direction === 'receive' && issuer}
      <SummaryRow>
        <span slot="label">{$translate('app.labels.issuer')}:</span>
        <span slot="value">
          {#if type}
            {issuer}
          {/if}
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

    <!-- DESCRIPTION -->
    <SummaryRow>
      <span slot="label">{$translate('app.labels.description')}:</span>
      <span slot="value">
        {description || 'none'}
      </span>
    </SummaryRow>

    <!-- EXPIRY -->
    {#if type === 'bolt11' && expiry}
      <SummaryRow>
        <span slot="label">{$translate('app.labels.expires')}:</span>
        <span class="flex items-center w-full justify-end" slot="value">
          {#if direction === 'receive'}
            <input
              class="h-2 bg-purple-50 appearance-none mr-4 accent-purple-500 dark:accent-purple-300"
              type="range"
              min="1"
              max="4"
              step="1"
              bind:value={expiryStep}
              on:change={updateExpiry}
            />
            <span class="whitespace-nowrap w-24 text-right">
              {#await formatCountdown( { date: expiryDate, language: $settings$.language } ) then countdown}
                {countdown}
              {/await}
            </span>
          {:else if expiresAt}
            <ExpiryCountdown small={false} label={false} expiry={new Date(expiresAt)} />
          {/if}
        </span>
      </SummaryRow>
    {/if}
  </div>

  <div class="mt-6 w-full">
    <Button
      {requesting}
      primary
      disabled={!!(expiresAt && Date.now() >= expiresAt)}
      text={$translate(
        `app.buttons.${direction === 'receive' ? 'create_invoice' : 'send_payment'}`
      )}
      on:click={() => dispatch('complete')}
    />
  </div>
</section>
