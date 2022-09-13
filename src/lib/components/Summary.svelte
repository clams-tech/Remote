<script lang="ts">
  import { MIN_IN_SECS } from '$lib/constants'
  import Button from '$lib/elements/Button.svelte'
  import SummaryRow from '$lib/elements/SummaryRow.svelte'
  import { translate } from '$lib/i18n/translations'
  import type { PaymentType } from '$lib/types'
  import { settings$ } from '$lib/streams'
  import { formatDestination, formatValueForDisplay } from '$lib/utils'
  import { createEventDispatcher } from 'svelte'
  import ExpiryCountdown from './ExpiryCountdown.svelte'

  export let type: PaymentType | null
  export let destination: string | null = ''
  export let direction: 'send' | 'receive'
  export let value: string | null
  export let description = ''
  export let expiry: number | null
  export let timestamp: number | null = null
  export let requesting: boolean

  $: expiryMinutes = expiry && expiry / MIN_IN_SECS

  const expiresAt = timestamp ? (timestamp + (expiry || $settings$.invoiceExpiry)) * 1000 : null
  const dispatch = createEventDispatcher()

  function updateExpiry(event: Event) {
    const { value } = event.target as HTMLInputElement

    const invoiceExpiry = parseInt(value) * MIN_IN_SECS

    expiry = invoiceExpiry

    const currentSettings = settings$.value

    settings$.next({
      ...currentSettings,
      invoiceExpiry
    })
  }
</script>

<section class="flex flex-col justify-center items-start w-full p-6 max-w-xl">
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
        <span slot="label">{$translate('app.labels.destination')}</span>
        <span slot="value">
          {#if type}
            {formatDestination(destination, type)}
          {/if}
        </span>
      </SummaryRow>
    {/if}

    <!-- AMOUNT -->
    <SummaryRow>
      <span slot="label">{$translate('app.labels.amount')}</span>
      <span slot="value">
        {#if value}
          {#if direction === 'receive' && value === '0'}
            {$translate('app.labels.any')}
          {:else}
            {formatValueForDisplay({ value, denomination: $settings$.primaryDenomination })}
            {$settings$.primaryDenomination}
          {/if}
        {/if}
      </span>
    </SummaryRow>

    <!-- DESCRIPTION -->
    <SummaryRow>
      <span slot="label">{$translate('app.labels.description')}</span>
      <span slot="value">
        {description}
      </span>
    </SummaryRow>

    <!-- EXPIRY -->
    {#if type === 'payment_request'}
      <SummaryRow>
        <span slot="label">{$translate('app.labels.expiry')}</span>
        <span class="flex items-center" slot="value">
          {#if direction === 'receive'}
            <input
              class="h-2 bg-purple-50 appearance-none mr-4 accent-purple-500 dark:accent-purple-300"
              type="range"
              min="1"
              max="60"
              bind:value={expiryMinutes}
              on:change={updateExpiry}
            />
            {expiryMinutes}
            {$translate('app.time.mins')}
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
