<script lang="ts">
  import { fade } from 'svelte/transition'
  import { page } from '$app/stores'
  import { isProtectedRoute } from '$lib/utils'
  import home from '$lib/icons/home'

  $: path = $page.url.pathname
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
