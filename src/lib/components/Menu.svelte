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
  let menuOpen = true
</script>

<div class="flex flex-col items-center justify-center absolute right-4 top-4">
  {#if path !== '/' && path !== '/decrypt' && isProtectedRoute(path)}
    <a href="/">
      <div in:fade class="w-8">
        {@html home}
      </div>
    </a>
  {/if}
  {#if path === '/' && device.type === 'mobile'}
    <div
      in:fade
      class="w-8 cursor-pointer absolute right-4 top-4"
      on:click={() => (menuOpen = !menuOpen)}
    >
      {#if !menuOpen}
        {@html menuIcon}
      {:else}
        {@html crossIcon}
      {/if}
    </div>
    {#if menuOpen}
      <div
        class="h-screen bg-white dark:bg-neutral-900 p-16 pt-10 shadow-lg shadow-purple-500"
        transition:fly={{ x: 36 }}
      >
        {#each NAV_LINKS as link}
          <div class="flex">
            <div
              in:fade
              class="mt-4 w-8 mr-2 hover:cursor-pointer"
              on:click={() => goto(link.route)}
            >
              {@html link.icon}
            </div>
            <span
              class="flex items-center mt-4 hover:cursor-pointer"
              on:click={() => goto(link.route)}
            >
              <p>{link.title}</p>
            </span>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
