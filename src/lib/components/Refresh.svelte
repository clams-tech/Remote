<script lang="ts">
  import { fade } from 'svelte/transition'
  import lightning from '$lib/lightning'
  import { funds$, nodeInfo$, payments$ } from '$lib/streams'
  import refreshIcon from '$lib/icons/refresh'
  import loading0Icon from '$lib/icons/loadingZero'
  import loading1Icon from '$lib/icons/loadingOne'
  import loading2Icon from '$lib/icons/loadingTwo'
  import loading3Icon from '$lib/icons/loadingThree'
  import loading4Icon from '$lib/icons/loadingFour'
  import loading5Icon from '$lib/icons/loadingFive'
  import loading6Icon from '$lib/icons/loadingSix'
  import { onDestroy } from 'svelte'

  $: refreshing = $nodeInfo$.loading || $payments$.loading || $funds$.loading

  async function refresh() {
    await lightning.refreshData()
  }

  let loadingCount = 0
  let intervalIds: NodeJS.Timer[] = []

  function clearIntervals() {
    intervalIds.forEach((interval) => {
      clearInterval(interval)
    })
  }

  $: if (refreshing === true) {
    const intervalId = setInterval(() => {
      if (loadingCount < 6) {
        loadingCount++
      } else loadingCount = 0
    }, 200)

    intervalIds.push(intervalId)
  } else {
    clearIntervals()
  }

  onDestroy(() => clearIntervals())
</script>

{#if refreshing}
  <div class="w-10">
    {#if loadingCount === 0}
      {@html loading0Icon}
    {:else if loadingCount == 1}
      {@html loading1Icon}
    {:else if loadingCount == 2}
      {@html loading2Icon}
    {:else if loadingCount == 3}
      {@html loading3Icon}
    {:else if loadingCount == 4}
      {@html loading4Icon}
    {:else if loadingCount == 5}
      {@html loading5Icon}
    {:else if loadingCount == 6}
      {@html loading6Icon}
    {/if}
  </div>
{:else}
  <div in:fade on:click={refresh} class:animate-spin={refreshing} class="w-8 cursor-pointer">
    {@html refreshIcon}
  </div>
{/if}
