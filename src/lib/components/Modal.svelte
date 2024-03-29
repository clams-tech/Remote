<script lang="ts">
  import { fly, fade } from 'svelte/transition'
  import { quintInOut } from 'svelte/easing'
  import close from '$lib/icons/close'
  import { createEventDispatcher } from 'svelte'

  let modal

  const dispatch = createEventDispatcher()

  const backgroundStyles =
    'w-full h-full fixed top-0 left-0 backdrop-blur-sm bg:neutral-50/40 flex flex-col items-center z-50'

  const modalStyles =
    'bg-neutral-900 shadow-lg py-4 px-6 relative flex items-center justify-center flex-col max-h-[95%] overflow-y-auto w-full'

  function closeModal() {
    dispatch('close')
  }

  let innerWidth: number
</script>

<svelte:window bind:innerWidth on:keyup={({ key }) => key === 'Escape' && closeModal()} />

{#if innerWidth < 450}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    in:fade|global={{ easing: quintInOut, duration: 600 }}
    on:click|stopPropagation={closeModal}
    class="{backgroundStyles} justify-end"
  >
    <div
      on:swipe={closeModal}
      bind:this={modal}
      in:fly|global={{ y: modal.clientHeight, easing: quintInOut, duration: 600 }}
      out:fly|global={{ y: modal.clientHeight, easing: quintInOut, duration: 600 }}
      on:click|stopPropagation
      class="{modalStyles} rounded-t-3xl w-full"
    >
      <div class="bg-neutral-300 w-8 h-1 rounded-full mt-2 top-0 absolute" />

      <div class="w-full py-2 h-full overflow-auto">
        <slot />
      </div>

      <div class="bg-neutral-300 w-24 h-1 rounded-full mb-2 bottom-0 absolute" />

      <button
        on:click={closeModal}
        class="absolute top-2 right-2 w-8 cursor-pointer hover:text-neutral-50 transition-colors text-neutral-300"
      >
        {@html close}
      </button>
    </div>
  </div>
{:else}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    in:fade|global={{ easing: quintInOut }}
    on:click|stopPropagation={closeModal}
    class="{backgroundStyles} justify-center block"
  >
    <div
      on:click|stopPropagation
      class="{modalStyles} rounded-3xl max-w-lg overflow-hidden pl-10 pr-12 pt-8 pb-10 select-text"
    >
      <button
        on:click={closeModal}
        class="absolute top-2 right-2 w-8 cursor-pointer hover:text-neutral-50 transition-colors text-neutral-300"
      >
        {@html close}
      </button>
      <slot />
    </div>
  </div>
{/if}
