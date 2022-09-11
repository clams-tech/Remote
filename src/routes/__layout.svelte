<script lang="ts" context="module">
  import type { Load } from '@sveltejs/kit'

  export const load: Load = async ({ url }) => {
    const { pathname } = url
    const defaultLocale = 'en'
    const initLocale = locale.get() || defaultLocale

    await loadTranslations(initLocale, pathname)

    return {}
  }
</script>

<script lang="ts">
  import { locale, loadTranslations } from '$lib/i18n/translations'
  import { beforeNavigate } from '$app/navigation'
  import { lastPath$ } from '$lib/streams'
  import registerSideEffects from '$lib/side-effects'
  import '../app.css'
  import Notifications from '$lib/components/Notifications.svelte'

  beforeNavigate(({ from }) => {
    if (from) {
      lastPath$.next(from.pathname)
    }
  })

  let innerHeight = window.innerHeight
  let innerWidth = window.innerWidth

  registerSideEffects()
</script>

<svelte:window bind:innerHeight bind:innerWidth />

<div
  style="width: {innerWidth}px; height: {innerHeight}px;"
  class="flex flex-col text-black dark:text-white dark:bg-black bg-white relative"
>
  <header class="flex px-2 py-2 fixed justify-end items-center top-0 w-full" />

  <!-- CONTENT -->
  <main
    class="flex flex-grow w-full flex-col items-center bg-inherit transition-all overflow-hidden"
  >
    <slot />
  </main>

  <Notifications />
</div>
