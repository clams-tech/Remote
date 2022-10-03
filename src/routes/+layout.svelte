<script lang="ts">
  import { beforeNavigate, goto } from '$app/navigation'
  import { browser } from '$app/environment'
  import { page } from '$app/stores'
  import { auth$, lastPath$ } from '$lib/streams'
  import registerSideEffects from '$lib/side-effects'
  import '../app.css'
  import Notifications from '$lib/components/Notifications.svelte'
  import { checkDataIsStored, getDataFromStorage } from '$lib/utils'
  import { AUTH_STORAGE_KEY } from '$lib/constants'
  import { initialiseData } from '$lib/data'
  import type { Auth } from '$lib/types'

  let checkingAuth = true

  beforeNavigate(({ from }) => {
    if (from) {
      lastPath$.next(from.url.pathname)
    }
  })

  let innerHeight = window.innerHeight
  let innerWidth = window.innerWidth

  registerSideEffects()

  if (browser) {
    initialise()
  }

  async function initialise() {
    await checkAuth()

    if (!checkingAuth) {
      initialiseData()
    }
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

  async function checkAuth(): Promise<void> {
    const storedAuth = checkDataIsStored(AUTH_STORAGE_KEY)
    const { pathname } = $page.url
    const protectedRoute = isProtectedRoute(pathname)

    if (storedAuth && !protectedRoute) {
      await goto('/')
    }

    if (!storedAuth && protectedRoute) {
      await goto('/connect')
    }

    if (storedAuth) {
      // try and decrypt storedAuth, will trigger pin modal if needed
      const auth = (await getDataFromStorage(AUTH_STORAGE_KEY)) as Auth
      auth && auth$.next(auth)
    }

    checkingAuth = false
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
    {#if !checkingAuth}
      <slot />
    {/if}
  </main>

  <Notifications />
</div>
