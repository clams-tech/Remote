<script lang="ts">
  import caret from '$lib/icons/caret.js'
  import { slide } from 'svelte/transition'

  export let label: string
  export let showMoar = false
</script>

<button on:click={() => (showMoar = !showMoar)} class="flex items-center w-full font-semibold">
  <div class:-rotate-90={!showMoar} class="w-3 mr-1 transition-transform">
    {@html caret}
  </div>

  <span class="underline">{label}</span>
</button>

{#if showMoar}
  <div transition:slide={{ duration: 250 }} class="mt-2 pl-4">
    <slot />
  </div>
{/if}
