<script lang="ts">
  import { STORAGE_KEYS, TILE_ICONS } from '$lib/constants.js'
  import Msg from '$lib/components/Msg.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import { storage } from '$lib/services.js'
  import { fade } from 'svelte/transition'
  import { settings$, wallets$ } from '$lib/streams.js'

  let showGetStartedHint = false
  const getStartedDismissed = storage.get(STORAGE_KEYS.getStartedHint)

  $: if (!getStartedDismissed && $wallets$ && !$wallets$.length) {
    showGetStartedHint = true
  }

  function handleCloseHint() {
    storage.write(STORAGE_KEYS.getStartedHint, 'true')
  }
</script>

<div
  in:fade={{ duration: 250 }}
  class="flex flex-col justify-center items-center overflow-hidden px-2 md:p-4 w-full relative"
>
  <div
    class="grid justify-center 2xl:max-w-2xl grid-cols-3 sm:grid-cols-4 gap-2 w-full max-w-xl overflow-auto"
  >
    {#each $settings$.tiles as tile (tile)}
      {@const route = `/${tile}`}
      <a
        href={route}
        class="aspect-square no-underline border border-neutral-600 rounded flex flex-col justify-center items-center hover:bg-neutral-800/90 bg-neutral-900 transition-all"
      >
        <div class="w-10 xs:w-12">
          {@html TILE_ICONS[tile]}
        </div>

        <div>{$translate(`app.routes.${route}.title`)}</div>
      </a>
    {/each}
  </div>
</div>

{#if showGetStartedHint}
  <div class="absolute bottom-0 p-4 w-full flex justify-center items-center bg-neutral-900">
    <div>
      <Msg
        on:close={handleCloseHint}
        message={$translate('app.routes./.get_started_hint')}
        type="info"
      />
    </div>
  </div>
{/if}
