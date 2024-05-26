<script lang="ts">
  import { STORAGE_KEYS, TILE_ICONS } from '$lib/constants.js'
  import Msg from '$lib/components/Msg.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import { storage } from '$lib/services.js'
  import { fade } from 'svelte/transition'
  import { settings$, wallets$ } from '$lib/streams.js'
  import type { Tile } from '$lib/@types/settings.js'
  import { createWallet } from '$lib/wallets'
  import { goto } from '$app/navigation'

  let showGetStartedHint = false
  const getStartedDismissed = storage.get(STORAGE_KEYS.getStartedHint)

  $: if (!getStartedDismissed && $wallets$ && !$wallets$.length) {
    showGetStartedHint = true
  } else {
    showGetStartedHint = false
  }

  function handleCloseHint() {
    storage.write(STORAGE_KEYS.getStartedHint, 'true')
    showGetStartedHint = false
  }

  const getIcon = (tile: string) => TILE_ICONS[tile as Tile]
</script>

<svelte:head>
  <title>{$translate(`app.routes./.title`)}</title>
</svelte:head>

<div
  in:fade={{ duration: 250 }}
  class="flex flex-col justify-center items-center overflow-hidden p-4 w-full relative"
>
  <div
    class="grid justify-center 2xl:max-w-2xl grid-cols-3 sm:grid-cols-4 gap-2 w-full max-w-xl overflow-auto"
  >
    {#each Object.entries($settings$.tiles) as [tile, display] (tile)}
      {#if display}
        {@const route = `/${tile}`}
        <a
          href={route}
          class="aspect-square no-underline border border-neutral-600 rounded flex flex-col justify-center items-center hover:bg-neutral-800/90 bg-neutral-900 transition-all"
        >
          <div class="w-10 xs:w-12">
            {@html getIcon(tile)}
          </div>

          <div>{$translate(`app.routes.${route}.title`)}</div>
        </a>
      {/if}
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
      >
        <button
          slot="inline"
          class="ml-1 underline font-semibold text-sm leading-tight"
          on:click={async () => {
            const { id } = await createWallet()
            goto(`/wallets/${id}`)
          }}>{$translate(`app.labels.wallet`).toLowerCase()}.</button
        ></Msg
      >
    </div>
  </div>
{/if}
