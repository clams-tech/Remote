<script lang="ts">
  import { fade } from 'svelte/transition'
  import lightning from '$lib/lightning'
  import { funds$, nodeInfo$, payments$ } from '$lib/streams'
  import refreshIcon from '$lib/icons/refresh'

  $: refreshing = $nodeInfo$.loading || $payments$.loading || $funds$.loading

  async function refresh() {
    await lightning.refreshData()
  }
</script>

<button
  in:fade|local={{ duration: 250 }}
  on:click={refresh}
  class:animate-spin={refreshing}
  class="w-6 cursor-pointer"
>
  {@html refreshIcon}
</button>
