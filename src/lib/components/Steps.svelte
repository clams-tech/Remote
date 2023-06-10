<script lang="ts">
  import Section from '$lib/elements/Section.svelte'
  import arrow from '$lib/icons/arrow.js'
  import caret from '$lib/icons/caret.js'
  import type { ComponentType } from 'svelte'
  import { fade, fly } from 'svelte/transition'

  export let components: ComponentType[]
  export let step = 0

  let innerWidth: number

  $: activeComponent = components[step]
  $: x = innerWidth > 500 ? 500 : innerWidth

  export const next = () => {
    step += 1
  }

  export const back = () => {
    step -= 1
  }

  export const stepTo = (index: number) => {
    step = index
  }

  const handleNext = () => {}
</script>

<svelte:window bind:innerWidth />

<Section>
  <slot />

  {#if activeComponent}
    <div in:fly|local={{ x, duration: 250 }} class="w-full">
      <svelte:component this={activeComponent} on:next={handleNext} />
    </div>
  {/if}

  {#if components.length > 1}
    <div class="w-full justify-center flex items-center mt-4 relative">
      {#if step > 0}
        <div in:fade class="flex items-center absolute left-0">
          <div class="mr4 w-6 rotate-90">{@html caret}</div>
          Back
        </div>
      {/if}

      <div class="flex items-center justify-center gap-x-2">
        {#each components as c, index}
          {@const completed = index <= step}
          <div
            class="w-3 h-3 rounded-full transition-colors bg-purple-500"
            class:opacity-50={!completed}
          />
        {/each}
      </div>
    </div>
  {/if}
</Section>
