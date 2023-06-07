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
  import share from '$lib/icons/share.js'
  import wallet from '$lib/icons/wallet.js'
  import { STORAGE_KEYS, getDataFromStorage, writeDataToStorage } from '$lib/storage.js'
  import { connections$ } from '$lib/streams.js'
  import { liveQuery } from 'dexie'
  import { pipe } from 'rxjs'
  import { fade } from 'svelte/transition'

  const buttons = [
    { key: 'send', icon: send, styles: '' },
    { key: 'scan', icon: scan, styles: '' },
    { key: 'receive', icon: receive, styles: '' },
    { key: 'connections', icon: keys, styles: '' },
    { key: 'balances', icon: wallet, styles: '' },
    { key: 'payments', icon: list, styles: '' },
    { key: 'channels', icon: channels, styles: '' },
    { key: 'accounting', icon: feeOutline, styles: '' },
    // { key: 'imports', icon: share, styles: '' },
    { key: 'offers', icon: lightningOutline, styles: '' },
    { key: 'contacts', icon: contacts, styles: '' },
    { key: 'settings', icon: settingsOutline, styles: '' }
  ]

  $: showGetStartedHint = !getDataFromStorage(STORAGE_KEYS.getStartedHint) && !$connections$.length

  function handleCloseHint() {
    writeDataToStorage(STORAGE_KEYS.getStartedHint, 'true')
  }
</script>

<div
  in:fade|local={{ duration: 250 }}
  class="flex flex-col justify-center items-center overflow-hidden px-2 md:p-4 w-full"
>
  <div
    class="grid justify-center 2xl:max-w-2xl grid-cols-3 sm:grid-cols-4 gap-2 w-full max-w-xl overflow-auto"
  >
    {#each buttons as { key, icon, styles } (key)}
      {@const route = `/${key}`}
      <a
        href={route}
        class="aspect-square no-underline border border-neutral-300 dark:border-neutral-600 rounded flex flex-col justify-center items-center dark:hover:bg-neutral-800/90 hover:bg-neutral-100/90 bg-neutral-50 dark:bg-neutral-900 transition-all"
      >
        <div class="w-10 xs:w-12 {styles}">
          {@html icon}
        </div>

        <div class="font-semi-bold">{$translate(`app.routes.${route}.title`)}</div>
      </a>
    {/each}
  </div>

  {#if showGetStartedHint}
    <div class="max-w-xl 2xl:max-w-2xl bg-neutral-50/90 rounded-lg mt-6">
      <Msg
        on:close={handleCloseHint}
        message={$translate('app.routes./.get_started_hint')}
        type="info"
      />
    </div>
  {/if}
</div>
