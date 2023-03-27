<script lang="ts">
  import { fade } from 'svelte/transition'
  import { page } from '$app/stores'
  import { isProtectedRoute } from '$lib/utils'
  import home from '$lib/icons/home'

  $: path = $page.url.pathname
</script>

{#if path !== '/' && path !== '/decrypt' && isProtectedRoute(path)}
  <a href="/" class="absolute right-0 top-0 p-4 z-20">
    <div in:fade|local class="w-8">
      {@html home}
    </div>
  </a>
{/if}
