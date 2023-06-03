<script lang="ts">
  import '../app.css'
  import { page } from '$app/stores'
  import { translate } from '$lib/i18n/translations.js'
  import clamsIcon from '$lib/icons/clamsIcon.js'
  import Background from '$lib/components/background.svelte'
  import { session$ } from '$lib/streams.js'
  import { browser } from '$app/environment'
  import { getSession } from '$lib/storage.js'
  import { goto } from '$app/navigation'
  import { fade } from 'svelte/transition'
  import { showHomeButton } from '$lib/utils.js'

  let innerHeight: number
  let innerWidth: number

  let loaded = false

  // if we have decrypted session in memory, no need to redirect
  if ($session$) {
    loaded = true
  }

  async function checkSession() {
    const storedSession = getSession()

    if (!storedSession) {
      // if no stored session, then we start a fresh session
      await goto('/welcome')
    } else {
      // otherwise we need to decrypt the session with a passphrase from the user
      await goto('/decrypt')
    }

    loaded = true
  }

  if (browser && !loaded) {
    checkSession()
  }
</script>

<svelte:head>
  <title>{$translate(`app.routes.${$page.url.pathname}.title`)}</title>
</svelte:head>

<svelte:window bind:innerHeight bind:innerWidth />

<main
  class="flex flex-col w-screen h-[calc(100dvh)] text-neutral-900 dark:text-neutral-50 bg-transparent overflow-hidden"
>
  <div class="-z-10">
    <Background />
  </div>

  <header class="flex w-full items-center justify-between">
    <div />

    {#if loaded && showHomeButton($page.url.pathname)}
      <div class="w-20 p-2">{@html clamsIcon}</div>
    {/if}
  </header>

  {#if loaded}
    <div in:fade class="flex-grow flex flex-col items-center justify-center overflow-hidden">
      <slot />
    </div>
  {/if}
</main>
