<script lang="ts">
  import { beforeNavigate, goto } from '$app/navigation'
  import { browser } from '$app/environment'
  import { page } from '$app/stores'
  import { auth$, lastPath$, modal$ } from '$lib/streams'
  import registerSideEffects from '$lib/side-effects'
  import '../app.css'
  import Notifications from '$lib/components/Notifications.svelte'
  import { getDataFromStorage, isProtectedRoute } from '$lib/utils'
  import { AUTH_STORAGE_KEY } from '$lib/constants'
  import { initialiseData } from '$lib/lightning'
  import { Modals, type Auth } from '$lib/types'
  import EncryptModal from '$lib/components/EncryptModal.svelte'
  import Menu from '$lib/components/Menu.svelte'
  import ClamsLogo from '$lib/icons/ClamsLogo.svelte'

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
    initialise()
  }

  async function initialise() {
    const storedAuth = getDataFromStorage(AUTH_STORAGE_KEY)
    const { pathname } = $page.url
    const protectedRoute = isProtectedRoute(pathname)

    if (storedAuth && !protectedRoute) {
      // redirect from welcome and connect -> home page if has connected before
      goto('/')
    }

    if (!storedAuth && protectedRoute) {
      // tried to load a protected route and has not connected before
      goto('/welcome')
    }

    let auth: Auth | null = null

    if (storedAuth) {
      try {
        auth = JSON.parse(storedAuth)
      } catch (error) {
        // encrypted auth, so route to decrypt
        goto('/decrypt')
      }
    }

    if (auth) {
      auth$.next(auth)
      initialiseData()
    }

    setTimeout(() => {
      loading = false
    }, 4000)
  }
</script>

<svelte:window bind:innerHeight bind:innerWidth />

<div
  style="width: {innerWidth}px; height: {innerHeight}px;"
  class="flex flex-col text-neutral-900 dark:text-neutral-50 dark:bg-neutral-900 neutral-50 relative"
>
  {#if loading}
    <div class="w-full h-full flex items-center justify-center">
      <div class="w-2/3 max-w-md">
        <ClamsLogo />
      </div>
    </div>
  {:else}
    <header class="flex px-2 py-2 fixed justify-end items-center top-0 w-full" />

    <div class="absolute top-4 right-4 z-20">
      <Menu />
    </div>

    <!-- CONTENT -->
    <main
      class="flex flex-grow w-full flex-col items-center bg-inherit transition-all overflow-hidden"
    >
      <slot />
    </main>

    <Notifications />
  {/if}
</div>

{#if $modal$ === Modals.pinEntry}
  <EncryptModal resetOption={false} />
{/if}
