<script lang="ts">
  import { onMount } from 'svelte'
  import { fly } from 'svelte/transition'
  import BackButton from './BackButton.svelte'

  export let back: (() => void) | null = null
  export let direction: 'left' | 'right' = 'left'
  export let backText: string | undefined = undefined

  let mounted = false

  onMount(() => (mounted = true))

  function getValue() {
    const { innerWidth } = window
    return innerWidth > 500 ? 500 : innerWidth
  }

  const x = direction === 'left' ? getValue() : -getValue()
</script>

{#if mounted}
  <div class="h-full w-full">
    {#if back}
      <BackButton text={backText} on:click={back} />
    {/if}

    <div in:fly|local={{ x, duration: 250 }} class="flex justify-center h-full overflow-auto">
      <slot />
    </div>
  </div>
{/if}
