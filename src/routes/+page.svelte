<script lang="ts">
  import { translate } from '$lib/i18n/translations.js'
  import ClamsLogo from '$lib/icons/ClamsLogo.svelte'
  import arrow from '$lib/icons/arrow.js'
  import scan from '$lib/icons/scan.js'

  const buttons = [
    { key: 'send', icon: arrow, styles: 'rotate-180' },
    { key: 'scan', icon: scan, styles: '' },
    { key: 'receive', icon: arrow, styles: '' },
    { key: 'offers', icon: arrow, styles: '' },
    { key: 'payments', icon: arrow, styles: '' },
    { key: 'balances', icon: arrow, styles: '' },
    { key: 'accounting', icon: arrow, styles: '' },
    { key: 'settings', icon: arrow, styles: '' },
    { key: 'connections', icon: arrow, styles: '' },
    { key: 'imports', icon: arrow, styles: '' }
  ]

  let screenWidth: number
</script>

<svelte:window bind:innerWidth={screenWidth} />

<div class="flex flex-col justify-center items-center w-full h-full relative">
  <div class="w-48 mb-6">
    <ClamsLogo />
  </div>

  <div class="flex flex-wrap gap-2 w-full max-w-xl justify-center items-center p-4">
    {#each buttons as { key, icon, styles } (key)}
      {@const route = `/${key}`}
      <a
        href={route}
        style="width: {Math.round(screenWidth / 10)}px;"
        class="aspect-square border rounded flex flex-col justify-center items-center dark:hover:bg-neutral-800/40 hover:bg-neutral-50/50 transition-all"
      >
        <div class="w-10 xs:w-12 {styles}">
          {@html icon}
        </div>
        <div class="text-base font-semi-bold">{$translate(`app.titles.${route}`)}</div>
      </a>
    {/each}
  </div>
</div>
