<script lang="ts">
  import '../app.css'
  import { page } from '$app/stores'
  import { translate } from '$lib/i18n/translations.js'
  import clamsIcon from '$lib/icons/clamsIcon.js'
  import Background from '$lib/components/background.svelte'
  import { checkedSession$, session$ } from '$lib/streams.js'
  import { fade } from 'svelte/transition'
  import { routeRequiresSession } from '$lib/utils.js'
  import { goto } from '$app/navigation'
  import { db } from '$lib/db.js'

  $: if ($session$) {
    initialize()
  }

  async function initialize() {
    console.log('INITIALIZING...')
    await db.open()
  }
</script>

<svelte:head>
  <title>{$translate(`app.routes.${$page.url.pathname}.title`)}</title>
</svelte:head>

<main
  class="flex flex-col w-screen h-[calc(100dvh)] text-neutral-900 dark:text-neutral-50 bg-transparent overflow-hidden"
>
  <div class="-z-10">
    <Background />
  </div>

  <header class="flex w-full items-center justify-between">
    <div />

    {#if routeRequiresSession($page.url.pathname) && $checkedSession$}
      <button class:pointer={$page.url.pathname !== '/'} on:click={() => goto('/')} class="w-20 p-2"
        >{@html clamsIcon}</button
      >
    {/if}
  </header>

  {#if $checkedSession$}
    <div in:fade class="flex-grow flex flex-col items-center justify-center overflow-hidden pb-4">
      <slot />
    </div>
  {/if}
</main>
