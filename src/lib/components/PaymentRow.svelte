<script lang="ts">
  import { fade } from 'svelte/transition'
  import { goto } from '$app/navigation'
  import type { Payment } from '$lib/types'
  import { settings$ } from '$lib/streams'
  import { BitcoinDenomination } from '$lib/types'
  import { formatValueForDisplay, formatDate } from '$lib/utils'
  import { convertValue } from '$lib/conversion'
  import { translate } from '$lib/i18n/translations'
  import lightning from '$lib/icons/lightning'
  import clock from '$lib/icons/clock'
  import close from '$lib/icons/close'

  export let payment: Payment

  const { id, direction, value, startedAt, completedAt, description, status } = payment

  $: primaryValue = convertValue({
    from: BitcoinDenomination.msats,
    to: $settings$.bitcoinDenomination,
    value
  })

  $: secondaryValue = convertValue({
    from: BitcoinDenomination.msats,
    to: $settings$.fiatDenomination,
    value
  })

  const abs = status === 'complete' ? (direction === 'receive' ? '+' : '-') : ''
</script>

<div
  in:fade
  on:click={() => goto(`/payments/${id}`)}
  class="flex items-start justify-between py-4 border-t w-full cursor-pointer"
>
  <div class="flex items-start w-3/5">
    <div
      class="border rounded-full w-8 mr-2 {direction === 'receive' && status === 'complete'
        ? 'border-utility-success text-utility-success'
        : status === 'pending'
        ? 'border-utility-pending text-utility-pending'
        : status === 'expired' || status === 'failed'
        ? 'border-utility-error text-utility-error'
        : 'border-current'} font-bold"
    >
      {#if status === 'complete'}
        {@html lightning}
      {:else if status === 'pending'}
        {@html clock}
      {:else}
        {@html close}
      {/if}
    </div>
    <div class="flex flex-col w-full">
      <span class="font-bold">{$translate('app.payment.status', { direction, status })}</span>

      {#if description}
        <span class="text-sm italic text-neutral-500 mt-1 break-all">{description}</span>
      {/if}

      <span class="text-sm text-neutral-400 mt-1">
        {#await formatDate( { date: completedAt || startedAt, language: $settings$.language } ) then formatted}
          <span in:fade={{ duration: 50 }}>{formatted}</span>
        {/await}
      </span>
    </div>
  </div>

  <div class="flex flex-col text-right w-2/5">
    <p class="font-bold">
      {abs}
      {formatValueForDisplay({
        denomination: $settings$.bitcoinDenomination,
        value: primaryValue,
        commas: true
      })}
      {$settings$.bitcoinDenomination}
    </p>
    <p class="text-neutral-400">
      {abs}
      {formatValueForDisplay({
        denomination: $settings$.fiatDenomination,
        value: secondaryValue,
        commas: true
      })}
      {$settings$.fiatDenomination}
    </p>
  </div>
</div>
