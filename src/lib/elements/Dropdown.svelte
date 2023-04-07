<script lang="ts">
  import { slide } from 'svelte/transition'
  import Button from './Button.svelte'

  export let label = ''
  let dropdownOpen = false
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="relative inline-block text-left"
  on:click={() => {
    dropdownOpen = !dropdownOpen
  }}
>
  <Button small={true} text={label} />
  {#if dropdownOpen}
    <div
      in:slide|local={{ duration: 250 }}
      out:slide|local={{ duration: 250 }}
      class="absolute left-0 z-10 mt-2 bg-white dark:bg-neutral-900 dark:text-white border rounded-md shadow-lg"
    >
      <div class="p-2">
        <slot />
      </div>
    </div>
  {/if}
</div>
