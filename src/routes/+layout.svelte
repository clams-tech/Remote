<script lang="ts">
  import { beforeNavigate } from '$app/navigation'
  import { page } from '$app/stores'
  import { translate } from '$lib/i18n/translations.js'
  import '../app.css'
</script>

<svelte:head>
  <title>{$translate(`app.titles.${$page.url.pathname}`)}</title>
</svelte:head>

<main
  class="w-screen h-screen flex flex-col text-neutral-900 dark:text-neutral-50 dark:bg-neutral-900 bg-neutral-50 relative overflow-hidden"
>
  <slot />
</main>
