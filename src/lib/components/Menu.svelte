<script lang="ts">
  import { fade, fly } from 'svelte/transition'
  import { page } from '$app/stores'
  import { isProtectedRoute, userAgent } from '$lib/utils'
  import home from '$lib/icons/home'
  import menuIcon from '$lib/icons/menu'
  import crossIcon from '$lib/icons/cross'
  import { NAV_LINKS } from '$lib/constants'
  import { goto } from '$app/navigation'

  const device = userAgent!.getDevice()

  $: path = $page.url.pathname
  let menuOpen = false
</script>

<div class="flex flex-col items-center justify-center absolute right-0 top-0">
  {#if path !== '/' && path !== '/decrypt' && isProtectedRoute(path)}
    <a href="/">
      <div in:fade class="w-8  absolute right-4 top-4">
        {@html home}
      </div>
    </a>
  {/if}
</div>
