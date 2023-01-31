<script lang="ts">
  import { fade } from 'svelte/transition'
  import { page } from '$app/stores'
  import lightning from '$lib/lightning'
  import { isProtectedRoute } from '$lib/utils'
  import { funds$, nodeInfo$, payments$ } from '$lib/streams'
  import home from '$lib/icons/home'
  import refreshIcon from '$lib/icons/refresh'

  $: path = $page.url.pathname
  $: refreshing = $nodeInfo$.loading || $payments$.loading || $funds$.loading

  async function refresh() {
    await lightning.refreshData()
  }
</script>

<div class="flex flex-col items-center justify-center">
  {#if path !== '/' && path !== '/decrypt' && isProtectedRoute(path)}
    <a href="/">
      <div in:fade class="w-8">
        {@html home}
      </div>
    </a>
  {/if}

  {#if path === '/'}
    <div in:fade on:click={refresh} class:animate-spin={refreshing} class="w-6 mt-2 cursor-pointer">
      {@html refreshIcon}
    </div>
  {/if}
</div>
