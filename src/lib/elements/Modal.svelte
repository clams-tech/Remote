<script lang="ts">
  import { fly, fade } from 'svelte/transition'
  import { quintInOut } from 'svelte/easing'
  import { swipe, drag } from '$lib/touch'
  import { DIRECTION_DOWN } from 'hammerjs'
  import close from '$lib/icons/close'
  import { createEventDispatcher } from 'svelte'

  let modal

  const dispatch = createEventDispatcher()

  const backgroundStyles =
    'w-full h-full fixed top-0 left-0 backdrop-blur-sm bg:neutral-50/40 flex flex-col items-center z-50'

  const modalStyles =
    'bg-neutral-900 shadow-lg py-4 px-6 relative flex items-center justify-center flex-col max-h-[95%] overflow-y-auto'

  function closeModal() {
    dispatch('close')
  }

  let innerWidth: number
</script>

<svelte:window bind:innerWidth />

{#if innerWidth < 450}
  <button
    transition:fade={{ easing: quintInOut, duration: 600 }}
    on:click|stopPropagation={closeModal}
    class="{backgroundStyles} justify-end"
  >
    <button
      use:swipe={{ direction: DIRECTION_DOWN, threshold: 50, velocity: 0.4 }}
      use:drag={{ direction: DIRECTION_DOWN, threshold: 0, maxDrag: 50 }}
      on:swipe={closeModal}
      bind:this={modal}
      in:fly={{ y: modal.clientHeight, easing: quintInOut, duration: 600 }}
      out:fly={{ y: modal.clientHeight, easing: quintInOut, duration: 600 }}
      on:click|stopPropagation
      class="{modalStyles} rounded-t-3xl w-full"
    >
      <div class="bg-neutral-300 w-8 h-1 rounded-full mt-2 top-0 absolute" />
      <div class="my-4 w-full h-full overflow-auto">
        <slot />
      </div>
      <div class="bg-neutral-300 w-24 h-1 rounded-full mb-2 bottom-0 absolute" />
    </button>
  </button>
{:else}
  <button
    transition:fade={{ easing: quintInOut }}
    on:click|stopPropagation={closeModal}
    class="{backgroundStyles} justify-center block"
  >
    <button
      on:click|stopPropagation
      class="{modalStyles} rounded-3xl max-w-lg pl-10 pr-12 pt-8 pb-10"
    >
      <button
        on:click={closeModal}
        class="absolute top-2 right-2 w-8 cursor-pointer hover:text-neutral-50 transition-colors text-neutral-400"
      >
        {@html close}
      </button>
      <slot />
    </button>
  </button>
{/if}
