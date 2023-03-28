<script lang="ts">
  import Button from '$lib/elements/Button.svelte'
  import Toggle from '$lib/elements/Toggle.svelte'
  import { translate } from '$lib/i18n/translations'
  import arrow from '$lib/icons/arrow'
  import caret from '$lib/icons/caret'
  import info from '$lib/icons/info'
  import { fade } from 'svelte/transition'

  export let next: () => void
  export let quantity: number
  export let max: number | null = null
  export let hint = ''
  export let allowQuantity: boolean | undefined = undefined

  function inc() {
    if (!max || quantity < max) {
      quantity += 1
    }
  }

  function dec() {
    if (quantity !== 0) {
      quantity -= 1
    }
  }
</script>

<section class="flex flex-col justify-center items-start w-full p-4 max-w-lg">
  <div class="mb-6">
    <h1 class="text-4xl font-bold">{$translate('app.headings.quantity')}</h1>

    {#if typeof allowQuantity === 'boolean'}
      <p class="text-neutral-600 dark:text-neutral-400 italic mt-4">
        {$translate('app.hints.quantity_max_allow')}
      </p>
      <div class="mt-4">
        <Toggle bind:toggled={allowQuantity} label="Enable" />
      </div>
    {/if}

    {#if allowQuantity !== false}
      <p class="text-neutral-600 dark:text-neutral-400 italic mt-4">
        {$translate('app.subheadings.quantity', {
          direction: typeof max === 'number' ? 'send' : 'receive',
          max: max?.toString()
        })}
      </p>
    {/if}

    {#if hint && allowQuantity !== false}
      <div class="flex items-center text-neutral-400 dark:text-neutral-400 mt-4">
        <div class="w-4 border border-neutral-400 dark:border-neutral-600 rounded-full">
          {@html info}
        </div>
        <div in:fade|local={{ duration: 250 }} class="text-sm ml-2 max-w-xs">{hint}</div>
      </div>
    {/if}
  </div>

  {#if allowQuantity !== false}
    <div class="my-4 flex items-center">
      <div class="text-4xl font-bold mono" style="width: {max ? max.toString().length : 1 * 2}rem;">
        {quantity}
      </div>
      <div class="ml-2">
        <button on:click={inc} class="w-5 block rotate-180">{@html caret}</button>
        <button on:click={dec} class="w-5 block">{@html caret}</button>
      </div>
    </div>
  {/if}

  <div class="mt-6 w-full">
    <Button text={$translate('app.buttons.next')} on:click={() => next()}>
      <div slot="iconRight" class="w-6 -rotate-90">
        {@html arrow}
      </div>
    </Button>
  </div>
</section>
