<script lang="ts">
  import { slide } from 'svelte/transition'
  import Button from '$lib/elements/Button.svelte'
  import caret from '$lib/icons/caret'
  import { clickOutside } from '$lib/utils'

  export let label = ''
  let dropdownOpen = false
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div on:click|stopPropagation class="relative inline-block text-left">
  <Button
    small={true}
    text={label}
    on:click={() => {
      dropdownOpen = !dropdownOpen
    }}
  >
    <div slot="iconRight" class="w-4 ml-2 transition-all" class:-rotate-180={dropdownOpen}>
      {@html caret}
    </div>
  </Button>
  {#if dropdownOpen}
    <div
      use:clickOutside={() => (dropdownOpen = false)}
      transition:slide|local={{ duration: 250 }}
      class="absolute left-0 z-10 mt-2 bg-white dark:bg-neutral-900 dark:text-white border rounded-md shadow-lg"
    >
      <slot />
    </div>
  {/if}
</div>
