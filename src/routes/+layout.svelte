<script lang="ts">
  import '../app.css'
  import { page } from '$app/stores'
  import { translate } from '$lib/i18n/translations.js'
  import Background from '$lib/components/background.svelte'
  import clamsIcon from '$lib/icons/clamsIcon.js'
  import Background_2 from '$lib/components/background-2.svelte'

  let innerHeight: number
  let innerWidth: number
</script>

<svelte:head>
  <title>{$translate(`app.titles.${$page.url.pathname}`)}</title>
</svelte:head>

<svelte:window bind:innerHeight bind:innerWidth />

<main
  style="width: {innerWidth}px; height: {innerHeight}px;"
  class="flex flex-col text-neutral-900 dark:text-neutral-50 dark:bg-neutral-900 bg-neutral-50 relative overflow-hidden"
>
  <!-- <Background /> -->
  <Background_2 />

  <div class="absolute top-0 left-0 w-full h-full flex flex-col justify-center p-2 overflow-hidden">
    {#if (innerHeight && innerHeight < 700) || $page.url.pathname !== '/'}
      <div class="w-16">{@html clamsIcon}</div>
    {/if}

    <slot />
  </div>
</main>
