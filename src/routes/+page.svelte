<script lang="ts">
  import { translate } from '$lib/i18n/translations.js'
  import ClamsLogo from '$lib/icons/ClamsLogo.svelte'
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

  const buttons = [
    { key: 'send', icon: send, styles: '' },
    { key: 'scan', icon: scan, styles: '' },
    { key: 'receive', icon: receive, styles: '' },
    { key: 'connections', icon: keys, styles: '' },
    { key: 'balances', icon: wallet, styles: '' },
    { key: 'payments', icon: list, styles: '' },
    { key: 'channels', icon: channels, styles: '' },
    { key: 'accounting', icon: feeOutline, styles: '' },
    { key: 'imports', icon: share, styles: '' },
    { key: 'offers', icon: lightningOutline, styles: '' },
    { key: 'settings', icon: settingsOutline, styles: '' },
    { key: 'contacts', icon: contacts, styles: '' }
  ]

  let innerHeight: number
</script>

<svelte:window bind:innerHeight />

<div
  class="flex flex-col justify-center items-center w-full h-full overflow-hidden p-2 bg-blend-overlay"
>
  {#if innerHeight && innerHeight > 700}
    <div class="w-1/4 max-w-[225px] min-w-[175px] mb-6">
      <ClamsLogo />
    </div>
  {/if}
  <div
    class="grid justify-center 2xl:max-w-2xl grid-cols-3 sm:grid-cols-4 gap-2 w-full max-w-xl overflow-auto"
  >
    {#each buttons as { key, icon, styles } (key)}
      {@const route = `/${key}`}
      <a
        href={route}
        class="aspect-square border border-neutral-800/70 dark:border-neutral-200/70 rounded flex flex-col justify-center items-center dark:hover:bg-neutral-800/70 hover:bg-neutral-100/70 transition-all"
      >
        <div class="w-10 xs:w-12 {styles}">
          {@html icon}
        </div>
        <div class="text-base font-semi-bold">{$translate(`app.titles.${route}`)}</div>
      </a>
    {/each}
  </div>
</div>
