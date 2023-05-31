<script lang="ts">
  import '../app.css'
  import { page } from '$app/stores'
  import { translate } from '$lib/i18n/translations.js'
  import clamsIcon from '$lib/icons/clamsIcon.js'
  import Background from '$lib/components/background.svelte'

  let innerHeight: number
  let innerWidth: number
</script>

<svelte:head>
  <title>{$translate(`app.titles.${$page.url.pathname}`)}</title>
</svelte:head>

<svelte:window bind:innerHeight bind:innerWidth />

<main
  class="flex flex-col text-neutral-900 w-screen h-screen dark:text-neutral-50 bg-transparent overflow-hidden"
>
  <div class="-z-10">
    <Background />
  </div>

  {#if (innerHeight && innerHeight < 700) || $page.url.pathname !== '/'}
    <div class="w-20 p-2">{@html clamsIcon}</div>
  {/if}

  <div class="flex-grow flex flex-col items-center justify-center pt-2 pb-12 px-2 overflow-hidden">
    <slot />
  </div>
</main>
