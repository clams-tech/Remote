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

<!-- @TODO - Add to home page & try update the animation when refreshing -->
<div in:fade on:click={refresh} class:animate-spin={refreshing} class="w-6 mt-2 cursor-pointer">
  {@html refreshIcon}
</div>
