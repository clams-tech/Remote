<script lang="ts">
  import Clear from '$lib/icons/Clear.svelte'
  import { resetApp } from '$lib/utils'
  import { createEventDispatcher } from 'svelte'

  export let pin = ''
  export let length = 4
  export let resetOption = true
  export const reset = () => {
    pin = ''
  }

  const dispatch = createEventDispatcher()

  const pinEntries = [1, 2, 3, 4]
  const buttons = [
    { main: 1, sub: '' },
    { main: 2, sub: 'ABC' },
    { main: 3, sub: 'DEF' },
    { main: 4, sub: 'GHI' },
    { main: 5, sub: 'JKL' },
    { main: 6, sub: 'MNO' },
    { main: 7, sub: 'PQRS' },
    { main: 8, sub: 'TUV' },
    { main: 9, sub: 'WXYZ' },
    { main: 0, sub: '' }
  ]

  $: if (pin.length === length) {
    setTimeout(() => dispatch('complete'), 250)
  }
</script>

<div class="flex flex-col items-center">
  <div class="flex flex-col items-center">
    <div class="flex items-center justify-between w-28">
      {#each pinEntries as entry}
        {@const filled = pin.length >= entry}
        <div
          class:shadow-purple-400={filled}
          class:bg-current={filled}
          class:border-0={filled}
          class="rounded-full w-6 h-6 border-neutral-500 border transition-colors shadow-xl"
        />
      {/each}
    </div>
  </div>

  {#if resetOption}
    <div class="mt-12 flex">
      <span class="text-neutral-500">Forgot your pin?</span>
      <span on:click={resetApp} class="ml-1 underline text-purple-500 cursor-pointer"
        >Reset App</span
      >
    </div>
  {/if}

  <div class="relative mt-12 flex flex-wrap justify-center w-[272px]">
    {#each buttons as { main, sub }}
      <div
        class:justify-center={main === 0}
        class="flex flex-col items-center justify-start m-1 w-20 h-20 border rounded-lg p-4 active:bg-neutral-100 dark:active:bg-neutral-800 cursor-pointer transition-colors"
        on:click={() => {
          if (pin.length < length) {
            pin += main
          }
        }}
      >
        <div class="text-2xl">{main}</div>
        <div class="text-xs text-neutral-500">{sub}</div>
      </div>
    {/each}

    <div
      class="w-20 h-20 border rounded absolute bottom-0 right-1 flex m-1 items-center justify-center cursor-pointer "
      on:click={() => {
        if (pin.length > 0) {
          pin = pin.slice(0, pin.length - 1)
        }
      }}
    >
      <div class="w-6">
        <Clear />
      </div>
    </div>
  </div>
</div>
