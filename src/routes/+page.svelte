<script lang="ts">
  import { STORAGE_KEYS } from '$lib/constants.js'
  import { db } from '$lib/db.js'
  import Msg from '$lib/components/Msg.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import channels from '$lib/icons/channels.js'
  import feeOutline from '$lib/icons/fee-outline.js'
  import graph from '$lib/icons/graph.js'
  import keys from '$lib/icons/keys.js'
  import lightningOutline from '$lib/icons/lightning-outline.js'
  import list from '$lib/icons/list.js'
  import settingsOutline from '$lib/icons/settings-outline.js'
  import wallet from '$lib/icons/wallet.js'
  import { storage } from '$lib/services.js'
  import { fade } from 'svelte/transition'

  const buttons = [
    { key: 'connections', icon: keys },
    { key: 'transactions', icon: list },
    { key: 'utxos', icon: wallet },
    { key: 'channels', icon: channels },
    { key: 'offers', icon: lightningOutline },
    { key: 'accounting', icon: feeOutline },
    { key: 'charts', icon: graph },
    { key: 'settings', icon: settingsOutline }
  ]

  let showGetStartedHint = false
  const getStartedDismissed = storage.get(STORAGE_KEYS.getStartedHint)

  if (!getStartedDismissed) {
    db.connections.toArray().then((connections) => {
      if (!connections.length) {
        showGetStartedHint = true
      }
    })
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
    {#each buttons as { key, icon } (key)}
      {@const route = `/${key}`}
      <a
        href={route}
        class="aspect-square no-underline border border-neutral-600 rounded flex flex-col justify-center items-center hover:bg-neutral-800/90 bg-neutral-900 transition-all"
      >
        <div class="w-10 xs:w-12">
          {@html icon}
        </div>

        <div class="font-semi-bold">{$translate(`app.routes.${route}.title`)}</div>
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
