<script lang="ts">
  import { convertValue } from '$lib/conversion'
  import Button from '$lib/elements/Button.svelte'
  import { translate } from '$lib/i18n/translations'
  import arrow from '$lib/icons/arrow'
  import { settings$ } from '$lib/streams'
  import Value from './Value.svelte'

  export let value = '0'
  export let direction: 'send' | 'receive'
  export let next: () => void
  export let readonly = false
  export let required = false

  $: secondaryValue =
    value !== '0' && value !== '0.'
      ? convertValue({
          value,
          from: $settings$.primaryDenomination,
          to: $settings$.secondaryDenomination
        })
      : value
</script>

<section class="flex flex-col justify-center items-start w-full p-6 max-w-lg">
  <div class="mb-6">
    <h1 class="text-4xl font-bold mb-4">{$translate('app.headings.amount')}</h1>
    <p class="text-neutral-600 dark:text-neutral-400 italic">
      {$translate('app.subheadings.amount', { direction })}
    </p>
  </div>

  <div class="my-4 w-full">
    <Value bind:primary={value} secondary={secondaryValue} {readonly} />
  </div>

  <div class="mt-6 w-full">
    <Button
      disabled={required && (!value || value === '0')}
      text={$translate('app.buttons.next')}
      on:click={next}
    >
      <div slot="iconRight" class="w-6 -rotate-90">
        {@html arrow}
      </div>
    </Button>
  </div>
</section>
