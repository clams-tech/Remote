<script lang="ts">
  import '../app.css'
  import { page } from '$app/stores'
  import { translate } from '$lib/i18n/translations.js'
  import Background from '$lib/components/background.svelte'
</script>

<svelte:head>
  <title>{$translate(`app.titles.${$page.url.pathname}`)}</title>
</svelte:head>

<main
  class="w-screen h-screen flex flex-col text-neutral-900 dark:text-neutral-50 dark:bg-neutral-900 bg-neutral-50 relative overflow-hidden"
>
  {#if $page.url.pathname === '/'}
    <Background />
  {/if}
  <div class="absolute top-0 left-0 w-full h-full p-2">
    <slot />
  </div>
</main>
