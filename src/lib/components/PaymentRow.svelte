<script lang="ts">
  import { fade } from 'svelte/transition'
  import { goto } from '$app/navigation'
  import type { Payment } from '$lib/types'
  import { settings$ } from '$lib/streams'
  import { BitcoinDenomination } from '$lib/types'
  import { formatValueForDisplay, formatDate } from '$lib/utils'
  import { convertValue } from '$lib/conversion'
  import { translate } from '$lib/i18n/translations'
  import Lightning from '$lib/icons/Lightning.svelte'
  import Clock from '$lib/icons/Clock.svelte'
  import Close from '$lib/icons/Close.svelte'

  export let payment: Payment

  const { id, direction, value, startedAt, description, status } = payment

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
  <div class="flex items-start">
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
        <Lightning />
      {:else if status === 'pending'}
        <Clock />
      {:else}
        <Close />
      {/if}
    </div>
    <div class="flex flex-col">
      <span class="font-bold">{$translate('app.payment.status', { direction, status })}</span>

      {#if description}
        <span class="text-sm italic text-neutral-500 max-w-[200px] mt-1">{description}</span>
      {/if}

      <span class="text-sm text-neutral-400 mt-1"
        >{formatDate({ date: startedAt, language: $settings$.language })}</span
      >
    </div>
  </div>

  <div class="flex flex-col text-right">
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
