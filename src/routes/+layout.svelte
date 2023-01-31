<script lang="ts">
  import { beforeNavigate } from '$app/navigation'
  import { browser } from '$app/environment'
  import { auth$, lastPath$ } from '$lib/streams'
  import registerSideEffects from '$lib/side-effects'
  import { locale, loadTranslations } from '$lib/i18n/translations'
  import '../app.css'
  import Notifications from '$lib/components/Notifications.svelte'
  import { loadVConsole } from '$lib/utils'
  import Menu from '$lib/components/Menu.svelte'
  import ClamsLogo from '$lib/icons/ClamsLogo.svelte'
  import lightning from '$lib/lightning'
  import SideNav from '$lib/components/SideNav.svelte'

  let loading = true
  let innerHeight = window.innerHeight
  let innerWidth = window.innerWidth

  beforeNavigate(({ from }) => {
    if (from) {
      lastPath$.next(from.url.pathname)
    }
  })

  registerSideEffects()

  if (browser) {
    initialise()

    if (import.meta.env.MODE === 'staging') {
      loadVConsole()
    }
  }

  async function initialise() {
    const defaultLocale = 'en'
    const initLocale = locale.get() || defaultLocale
    await loadTranslations(initLocale)

    $auth$ && lightning.initialiseData()

    setTimeout(() => (loading = false), 2000)
  }
</script>

<svelte:window bind:innerHeight bind:innerWidth />

<div
  style="width: {innerWidth}px; height: {innerHeight}px;"
  class="flex w-screen h-screen flex-col text-neutral-900 dark:text-neutral-50 dark:bg-neutral-900 neutral-50 relative overflow-hidden"
>
  {#if loading}
    <div class="w-full h-full flex items-center justify-center">
      <div class="w-2/3 max-w-lg">
        <ClamsLogo min={1} max={2.1} />
      </div>
    </div>
  {:else}
    <header class="flex px-2 py-2 fixed justify-end items-center top-0 w-full" />
    <div class="absolute top-4 right-4 z-20">
      <Menu />
    </div>

    <!-- CONTENT -->
    <main
      class="flex flex-grow w-full justify-center flex-col items-center bg-inherit transition-all overflow-hidden"
    >
      <slot />
    </main>

    <Notifications />
  {/if}
</div>
