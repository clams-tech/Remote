<script lang="ts">
  import { slide } from 'svelte/transition'
  import Button from '$lib/elements/Button.svelte'
  import caret from '$lib/icons/caret'

  export let label = ''
  let dropdownOpen = false
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="relative inline-block text-left">
  <Button
    small={true}
    text={label}
    on:click={() => {
      dropdownOpen = !dropdownOpen
    }}
  >
    <div slot="iconRight" class="w-5 ml-2 mb-[2px]" class:-rotate-180={!dropdownOpen}>
      {@html caret}
    </div>
  </Button>
  {#if dropdownOpen}
    <div
      in:slide|local={{ duration: 250 }}
      out:slide|local={{ duration: 250 }}
      class="absolute left-0 z-10 mt-2 bg-white dark:bg-neutral-900 dark:text-white border rounded-md shadow-lg"
    >
      <slot />
    </div>
  {/if}
</div>
