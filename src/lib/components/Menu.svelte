<script lang="ts">
  import { fade } from 'svelte/transition'
  import { page } from '$app/stores'
  import lightning from '$lib/lightning'
  import Home from '$lib/icons/Home.svelte'
  import Refresh from '$lib/icons/Refresh.svelte'
  import Settings from '$lib/icons/Settings.svelte'
  import { isProtectedRoute } from '$lib/utils'
  import { funds$, nodeInfo$, payments$ } from '$lib/streams'

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
        <Home />
      </div>
    </a>
  {/if}

  {#if path === '/'}
    <a href="/settings">
      <div in:fade class="w-8">
        <Settings />
      </div>
    </a>

    <div in:fade on:click={refresh} class:animate-spin={refreshing} class="w-6 mt-2 cursor-pointer">
      <Refresh />
    </div>
  {/if}
</div>
