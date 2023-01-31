<script lang="ts">
  import { fade } from 'svelte/transition'
  import { translate } from '$lib/i18n/translations'
  import { funds$, nodeInfo$, settings$ } from '$lib/streams'
  import { calculateBalance } from '$lib/utils'
  import Spinner from '$lib/elements/Spinner.svelte'
  import Value from '$lib/components/Value.svelte'
  import { convertValue } from '$lib/conversion'
  import { BitcoinDenomination } from '$lib/types'
  import RecentPayment from '$lib/components/RecentPayment.svelte'
  import arrow from '$lib/icons/arrow'
  import qr from '$lib/icons/qr'
  import SideNav from '$lib/components/SideNav.svelte'

  const buttons = [
    { key: 'send', icon: arrow, styles: 'rotate-180' },
    { key: 'scan', icon: qr, styles: '' },
    { key: 'receive', icon: arrow, styles: '' }
  ]

  $: balanceMsat = $funds$.data && calculateBalance($funds$.data)

  $: balancePrimaryDenom =
    balanceMsat &&
    convertValue({
      value: balanceMsat,
      from: BitcoinDenomination.msats,
      to: $settings$.primaryDenomination
    })

  $: balanceSecondaryDenom =
    balanceMsat &&
    convertValue({
      value: balanceMsat,
      from: BitcoinDenomination.msats,
      to: $settings$.secondaryDenomination
    })
</script>

<svelte:head>
  <title>{$translate('app.titles.home')}</title>
</svelte:head>

<SideNav />
<div in:fade class="h-full w-full flex flex-col items-center justify-center relative">
  <div class="w-full max-w-lg p-6">
    {#if $nodeInfo$.data}
      <span in:fade class="flex items-center w-full justify-center text-xl mb-4"
        >{$nodeInfo$.data.alias}
        <span
          style="background-color: #{$nodeInfo$.data.color};"
          class="w-4 h-4 rounded-full ml-2"
        /></span
      >
    {/if}

    {#if $funds$.loading && !$funds$.data}
      <div in:fade class="p-6">
        <Spinner />
      </div>
    {:else}
      <div in:fade>
        <Value primary={balancePrimaryDenom} secondary={balanceSecondaryDenom} readonly />
      </div>
    {/if}

    <div class="grid grid-cols-3 gap-4 xl:gap-6 2xl:gap-8 w-full p-y mt-4">
      {#each buttons as { key, icon, styles } (key)}
        <a
          href={`/${key}`}
          class="aspect-square border rounded flex flex-col justify-center items-center"
        >
          <div class="w-10 lg:w-12 {styles}">
            {@html icon}
          </div>
          <div class="text-base font-semi-bold">{$translate(`app.buttons.${key}`)}</div>
        </a>
      {/each}
    </div>
  </div>

  <RecentPayment />
</div>
