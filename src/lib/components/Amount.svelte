<script lang="ts">
  import { convertValue } from '$lib/conversion'
  import Button from '$lib/elements/Button.svelte'
  import { translate } from '$lib/i18n/translations'
  import arrow from '$lib/icons/arrow'
  import info from '$lib/icons/info'
  import warning from '$lib/icons/warning'
  import { settings$ } from '$lib/streams'
  import { BitcoinDenomination } from '$lib/types'
  import Big from 'big.js'
  import { fade } from 'svelte/transition'
  import Value from './Value.svelte'

  export let value = '0'
  export let direction: 'send' | 'receive'
  export let next: () => void
  export let readonly = false
  export let required = false
  export let hint = ''
  export let error = ''
  export let minMsats = ''
  export let maxMsats = ''

  $: secondaryValue = !value
    ? '0'
    : value !== '0' && value !== '0.'
    ? convertValue({
        value,
        from: $settings$.primaryDenomination,
        to: $settings$.secondaryDenomination
      })
    : value

  function invalid(value: string): boolean {
    if (required && (!value || value === '0')) {
      return true
    }

    const valueMsats = convertValue({
      value,
      from: $settings$.primaryDenomination,
      to: BitcoinDenomination.msats
    })

    if (minMsats && Big(valueMsats || '0').lt(minMsats)) {
      return true
    }

    if (maxMsats && Big(valueMsats || '0').gt(maxMsats)) {
      return true
    }

    return false
  }
</script>

<section class="flex flex-col justify-center items-start w-full p-6 max-w-lg">
  <div class="mb-6">
    <h1 class="text-4xl font-bold mb-4">{$translate('app.headings.amount')}</h1>
    <p class="text-neutral-600 dark:text-neutral-400 italic">
      {$translate('app.subheadings.amount', { direction })}
    </p>

    {#if hint}
      <div class="flex items-center text-neutral-400 dark:text-neutral-600 mt-4">
        <div class="w-4 border border-neutral-400 dark:border-neutral-600 rounded-full">
          {@html info}
        </div>
        <div in:fade class="text-sm ml-2 max-w-xs">{hint}</div>
      </div>
    {/if}

    {#if error}
      <div class="flex items-center text-utility-error mt-4">
        <div class="w-4">{@html warning}</div>
        <div in:fade class="text-sm ml-2">{error}</div>
      </div>
    {/if}
  </div>

  <div class="my-4 w-full">
    <Value
      bind:primary={value}
      secondary={secondaryValue}
      {readonly}
      {next}
      on:update={() => (error = '')}
    />
  </div>

  <div class="mt-6 w-full">
    <Button disabled={invalid(value)} text={$translate('app.buttons.next')} on:click={next}>
      <div slot="iconRight" class="w-6 -rotate-90">
        {@html arrow}
      </div>
    </Button>
  </div>
</section>
