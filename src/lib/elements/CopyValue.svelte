<script lang="ts">
  import check from '$lib/icons/check'
  import copy from '$lib/icons/copy'
  import { truncateValue, writeClipboardValue } from '$lib/utils'
  import { onDestroy } from 'svelte'
  import { fade } from 'svelte/transition'

  export let value: string
  export let truncateLength = 0
  export let label = ''

  let copySuccess: boolean
  let copyAnimationTimeout: NodeJS.Timeout

  async function copyValue() {
    copySuccess = await writeClipboardValue(value)

    if (copySuccess) {
      copyAnimationTimeout = setTimeout(() => (copySuccess = false), 3000)
    }
  }

  onDestroy(() => {
    copyAnimationTimeout && clearTimeout(copyAnimationTimeout)
  })
</script>

<button on:click|stopPropagation={copyValue} class="flex items-center text-current">
  <span>
    {label ? label : truncateLength ? truncateValue(value, truncateLength) : value}
  </span>

  {#if copySuccess}
    <div in:fade class="ml-1 w-6 text-utility-success">
      {@html check}
    </div>
  {:else}
    <div in:fade class="ml-1 w-6">
      {@html copy}
    </div>
  {/if}
</button>
