<script lang="ts">
  import check from '$lib/icons/check'
  import close from '$lib/icons/close.js'
  import copy from '$lib/icons/copy'
  import { clipboard } from '$lib/services.js'
  import { truncateValue } from '$lib/utils'
  import { onDestroy } from 'svelte'
  import { fade } from 'svelte/transition'

  export let value: string
  export let truncateLength = 0
  export let label = ''
  export let icon = copy
  export let hideValue = false

  let copyStatus: 'error' | 'success' | null = null
  let copyAnimationTimeout: NodeJS.Timeout

  async function copyValue() {
    try {
      await clipboard.write(value)
      copyStatus = 'success'
    } catch (error) {
      copyStatus = 'error'
    } finally {
      copyAnimationTimeout = setTimeout(() => (copyStatus = null), 4000)
    }
  }

  onDestroy(() => {
    copyAnimationTimeout && clearTimeout(copyAnimationTimeout)
  })
</script>

<button on:click|stopPropagation={copyValue} class="flex items-center text-current">
  {#if !hideValue}
    <span>
      {label ? label : truncateLength ? truncateValue(value, truncateLength) : value}
    </span>
  {/if}

  {#if copyStatus}
    <div
      in:fade={{ duration: 250 }}
      class="ml-1 w-6"
      class:text-utility-success={copyStatus === 'success'}
      class:text-utility-error={copyStatus === 'error'}
    >
      {@html copyStatus === 'success' ? check : close}
    </div>
  {:else}
    <div in:fade={{ duration: 250 }} class="ml-1 w-6">
      {@html icon}
    </div>
  {/if}
</button>
