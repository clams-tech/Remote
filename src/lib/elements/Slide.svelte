<script lang="ts">
  import { fly } from 'svelte/transition'
  import BackButton from './BackButton.svelte'

  export let back: (() => void) | null = null
  export let direction: 'left' | 'right' = 'left'
  export let backText: string | undefined = undefined

  function getValue() {
    const { innerWidth } = window
    return innerWidth > 500 ? 500 : innerWidth
  }

  const x = direction === 'left' ? getValue() : -getValue()
</script>

<div class="h-full w-full">
  {#if back}
    <BackButton text={backText} on:click={back} />
  {/if}

  <div in:fly|local={{ x }} class="flex justify-center h-full overflow-auto">
    <slot />
  </div>
</div>
