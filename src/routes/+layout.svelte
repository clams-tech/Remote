<script lang="ts">
  import { beforeNavigate, goto } from '$app/navigation'
  import { browser } from '$app/environment'
  import { page } from '$app/stores'
  import { credentials$, lastPath$ } from '$lib/streams'
  import registerSideEffects from '$lib/side-effects'
  import '../app.css'
  import Notifications from '$lib/components/Notifications.svelte'

  let loading = true

  beforeNavigate(({ from }) => {
    if (from) {
      lastPath$.next(from.url.pathname)
    }
  })

  let innerHeight = window.innerHeight
  let innerWidth = window.innerWidth

  registerSideEffects()

  if (browser) {
    checkCredentials()
  }

  function isProtectedRoute(route: string): boolean {
    switch (route) {
      case '/connect':
      case '/welcome':
        return false
      default:
        return true
    }
  }

  async function checkCredentials(): Promise<void> {
    const { connection, rune } = credentials$.getValue()
    const connected = !!(connection && rune)
    const { pathname } = $page.url
    const protectedRoute = isProtectedRoute(pathname)

    if (connected && !protectedRoute) {
      await goto('/')
    }

    if (!connected && protectedRoute) {
      await goto('/connect')
    }

    loading = false
  }
</script>

<svelte:window bind:innerHeight bind:innerWidth />

<div
  style="width: {innerWidth}px; height: {innerHeight}px;"
  class="flex flex-col text-neutral-900 dark:text-neutral-50 dark:bg-neutral-900 neutral-50 relative"
>
  <header class="flex px-2 py-2 fixed justify-end items-center top-0 w-full" />

  <!-- CONTENT -->
  <main
    class="flex flex-grow w-full flex-col items-center bg-inherit transition-all overflow-hidden"
  >
    {#if !loading}
      <slot />
    {/if}
  </main>

  <Notifications />
</div>
