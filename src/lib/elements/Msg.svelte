<script lang="ts">
  import warning from '$lib/icons/warning'
  import close from '$lib/icons/close'
  import { fade, slide } from 'svelte/transition'
  import info from '$lib/icons/info.js'
  import { createEventDispatcher } from 'svelte'

  type MsgType = 'error' | 'info' | 'warning'
  type MsgValues = { colors: Colors; icon: string }
  type Colors = { main: string; button: string; icon: string }

  export let message: string
  export let type: MsgType
  export let closable = true

  const types: Record<MsgType, MsgValues> = {
    error: {
      colors: {
        main: 'border-utility-error/50 bg-utility-error/5 text-utility-error',
        button: 'text-utility-error/50',
        icon: 'text-utility-error'
      },
      icon: warning
    },
    warning: {
      colors: {
        main: 'border-utility-pending/50 bg-utility-pending/5 text-utility-pending',
        button: 'text-utility-pending/50',
        icon: 'text-utility-pending'
      },
      icon: warning
    },
    info: {
      colors: {
        main: 'border-neutral-300/50 bg-neutral-300/5 text-neutral-300',
        button: 'text-neutral-300/50',
        icon: 'text-neutral-300 border rounded-full border-current'
      },
      icon: info
    }
  }

  $: msgValue = types[type]

  const dispatch = createEventDispatcher()

  function handleClose() {
    message = ''
    dispatch('close')
  }
</script>

{#if message}
  <div
    in:fade|local={{ duration: 250, delay: 150 }}
    out:fade|local={{ duration: 250 }}
    class="bg-neutral-900/90 rounded-lg"
  >
    <div
      in:slide|local={{ duration: 250 }}
      out:slide|local={{ duration: 250, delay: 150 }}
      class="pl-6 pr-8 w-full py-4 rounded-lg border flex justify-center items-start relative overflow-hidden transition-all {msgValue
        .colors.main}"
    >
      {#if closable}
        <button
          on:click={handleClose}
          class="absolute top-0 right-0 w-7 cursor-pointer flex-shrink-0 {msgValue.colors.button}"
        >
          {@html close}
        </button>
      {/if}

      <div class="w-6 flex-shrink-0 mr-4 {msgValue.colors.icon}">
        {@html msgValue.icon}
      </div>

      <span>
        <!-- text-bitcoin-orange -->
        {@html message}
      </span>
    </div>
  </div>
{/if}
