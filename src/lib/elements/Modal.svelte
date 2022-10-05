<script lang="ts" context="module">
  import { Modals } from '$lib/types'

  export const closeModal = () => {
    modal$.next(Modals.none)
  }
</script>

<script lang="ts">
  import { fly, fade } from 'svelte/transition'
  import { quintInOut, quintOut } from 'svelte/easing'
  import { swipe, drag, userAgent } from '$lib/utils'
  import Close from '$lib/icons/Close.svelte'
  import { modal$ } from '$lib/streams'
  import { DIRECTION_DOWN } from 'hammerjs'

  let modal

  const device = userAgent.getDevice()

  const backgroundStyles =
    'w-full h-full fixed top-0 left-0 backdrop-blur-sm dark:bg:neutral-50 bg-neutral-900/40 flex flex-col items-center z-20'

  const modalStyles =
    'bg-neutral-50 dark:text-neutral-900 shadow-lg p-4 relative flex items-center justify-center flex-col max-h-screen overflow-y-auto'
</script>

{#if device.type === 'mobile'}
  <div
    transition:fade={{ easing: quintInOut, duration: 600 }}
    on:click|stopPropagation={closeModal}
    class="{backgroundStyles} justify-end"
  >
    <div
      use:swipe={{ direction: DIRECTION_DOWN, threshold: 50, velocity: 0.4 }}
      use:drag={{ direction: DIRECTION_DOWN, threshold: 0, maxDrag: 50 }}
      on:swipe={closeModal}
      bind:this={modal}
      in:fly={{ y: modal.clientHeight, easing: quintInOut, duration: 600 }}
      out:fly={{ y: modal.clientHeight, easing: quintOut, duration: 400 }}
      on:click|stopPropagation
      class="{modalStyles} rounded-t-3xl w-full"
    >
      <div class="bg-neutral-300 w-8 h-1 rounded-full mt-2 top-0 absolute" />
      <div class="my-4 w-full">
        <slot />
      </div>
      <div class="bg-neutral-300 w-24 h-1 rounded-full mb-2 bottom-0 absolute" />
    </div>
  </div>
{:else}
  <div
    transition:fade={{ easing: quintInOut, duration: 600 }}
    on:click|stopPropagation={closeModal}
    class="{backgroundStyles} justify-center"
  >
    <div on:click|stopPropagation class="{modalStyles} rounded-3xl max-w-sm p-8">
      <div on:click={closeModal} class="absolute top-2 right-2 w-8 cursor-pointer text-neutral-400">
        <Close />
      </div>
      <slot />
    </div>
  </div>
{/if}
