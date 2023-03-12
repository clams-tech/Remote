<script lang="ts">
  import Button from '$lib/elements/Button.svelte'
  import { translate } from '$lib/i18n/translations'
  import arrow from '$lib/icons/arrow'
  import caret from '$lib/icons/caret'

  export let next: () => void
  export let quantity: number
  export let max = 0

  function inc() {
    if (quantity < max) {
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
    <h1 class="text-4xl font-bold mb-4">{$translate('app.headings.quantity')}</h1>
    <p class="text-neutral-600 dark:text-neutral-400 italic">
      {$translate('app.subheadings.quantity', {
        direction: max ? 'send' : 'receive',
        max: max.toString()
      })}
    </p>
  </div>

  <div class="my-4 flex items-center">
    <div class="text-6xl font-bold mono" style="width: {max.toString().length * 2}rem;">
      {quantity}
    </div>
    <div class="ml-2">
      <button on:click={inc} class="w-8 block rotate-180">{@html caret}</button>
      <button on:click={dec} class="w-8 block">{@html caret}</button>
    </div>
  </div>

  <div class="mt-6 w-full">
    <Button text={$translate('app.buttons.next')} on:click={() => next()}>
      <div slot="iconRight" class="w-6 -rotate-90">
        {@html arrow}
      </div>
    </Button>
  </div>
</section>
