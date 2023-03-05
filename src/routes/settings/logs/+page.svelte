<script lang="ts">
  import { fade } from 'svelte/transition'
  import Slide from '$lib/elements/Slide.svelte'
  import { translate } from '$lib/i18n/translations'
  import { goto } from '$app/navigation'
  import { recentLogs$ } from '$lib/streams'
  import settingsOutline from '$lib/icons/settings-outline'
</script>

<svelte:head>
  <title>{$translate('app.titles./settings/logs')}</title>
</svelte:head>

<Slide
  back={() => {
    goto('/settings')
  }}
  backText={$translate('app.titles./settings')}
>
  <section in:fade class="flex flex-col justify-center w-full p-6 max-w-lg">
    <div class="flex items-center mb-6 mt-12">
      <div class="w-10 mr-2">{@html settingsOutline}</div>
      <h1 class="text-4xl font-bold">
        {$translate('app.titles./settings/logs')}
      </h1>
    </div>

    <div class="w-full h-full overflow-y-auto overflow-x-hidden">
      {#each $recentLogs$ as log}
        <div class="text-sm py-2 border-b">{log}</div>
      {/each}
    </div>
  </section>
</Slide>
