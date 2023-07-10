<script lang="ts">
  import { db } from '$lib/db.js'
  import Msg from '$lib/elements/Msg.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import channels from '$lib/icons/channels.js'
  import contacts from '$lib/icons/contacts.js'
  import feeOutline from '$lib/icons/fee-outline.js'
  import keys from '$lib/icons/keys.js'
  import lightningOutline from '$lib/icons/lightning-outline.js'
  import list from '$lib/icons/list.js'
  import receive from '$lib/icons/receive.js'
  import scan from '$lib/icons/scan.js'
  import send from '$lib/icons/send.js'
  import settingsOutline from '$lib/icons/settings-outline.js'
  import wallet from '$lib/icons/wallet.js'
  import { STORAGE_KEYS, getDataFromStorage, writeDataToStorage } from '$lib/storage.js'
  import { fade } from 'svelte/transition'

  const buttons = [
    { key: 'send', icon: send },
    { key: 'scan', icon: scan },
    { key: 'receive', icon: receive },
    { key: 'connections', icon: keys },
    { key: 'balances', icon: wallet },
    { key: 'payments', icon: list },
    { key: 'channels', icon: channels },
    { key: 'accounting', icon: feeOutline },
    // { key: 'imports', icon: share, styles: '' },
    { key: 'offers', icon: lightningOutline },
    { key: 'contacts', icon: contacts },
    { key: 'settings', icon: settingsOutline }
  ]

  let showGetStartedHint = false

  !getDataFromStorage(STORAGE_KEYS.getStartedHint) &&
    db.connections.toArray().then((connections) => {
      if (!connections.length) {
        showGetStartedHint = true
      }
    })

  function handleCloseHint() {
    writeDataToStorage(STORAGE_KEYS.getStartedHint, 'true')
  }
</script>

<div
  in:fade={{ duration: 250 }}
  class="flex flex-col justify-center items-center overflow-hidden px-2 md:p-4 w-full"
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

  {#if showGetStartedHint}
    <div class="max-w-xl 2xl:max-w-2xl mt-6">
      <Msg
        on:close={handleCloseHint}
        message={$translate('app.routes./.get_started_hint')}
        type="info"
      />
    </div>
  {/if}
</div>
