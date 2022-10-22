<script lang="ts">
  import { fade } from 'svelte/transition'
  import Slide from '$lib/elements/Slide.svelte'
  import { translate } from '$lib/i18n/translations'
  import { goto } from '$app/navigation'
  import { recentLogs$ } from '$lib/streams'
</script>

<svelte:head>
  <title>{$translate('app.titles.settings_logs')}</title>
</svelte:head>

<Slide
  back={() => {
    goto('/settings')
  }}
>
  <section in:fade class="flex flex-col items-center justify-center w-full p-6 max-w-lg">
    <h1 class="text-lg w-full text-center mt-2 mb-6 font-bold">
      {$translate('app.titles.settings_logs')}
    </h1>

    <div class="w-full h-full overflow-y-auto overflow-x-hidden">
      {#each $recentLogs$ as log}
        <div class="text-sm py-2 border-b">{log}</div>
      {/each}
    </div>
  </section>
</Slide>
