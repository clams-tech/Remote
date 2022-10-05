<script lang="ts">
  import { fade } from 'svelte/transition'
  import { page } from '$app/stores'
  import { refreshData } from '$lib/data'
  import Home from '$lib/icons/Home.svelte'
  import Refresh from '$lib/icons/Refresh.svelte'
  import Settings from '$lib/icons/Settings.svelte'
  import { isProtectedRoute } from '$lib/utils'

  $: path = $page.url.pathname

  let refreshing = false

  async function refresh() {
    refreshing = true
    await refreshData()
    refreshing = false
  }
</script>

<div class="flex flex-col items-center justify-center">
  {#if path !== '/' && isProtectedRoute(path)}
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
