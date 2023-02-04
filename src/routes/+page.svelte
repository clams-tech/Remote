<script lang="ts">
  import { fade } from 'svelte/transition'
  import { translate } from '$lib/i18n/translations'
  import { funds$, nodeInfo$, settings$ } from '$lib/streams'
  import { calculateBalance, isPWA, logger } from '$lib/utils'
  import Spinner from '$lib/elements/Spinner.svelte'
  import Value from '$lib/components/Value.svelte'
  import { convertValue } from '$lib/conversion'
  import { BitcoinDenomination } from '$lib/types'
  import RecentPayment from '$lib/components/RecentPayment.svelte'
  import ClamsLogo from '$lib/icons/ClamsLogo.svelte'
  import arrow from '$lib/icons/arrow'
  import qr from '$lib/icons/qr'
  import { browser } from '$app/environment'

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

  if (browser && !isPWA()) {
    try {
      logger.info('Attemptin to register protocol handler')
      navigator.registerProtocolHandler('bitcoin', '/send?destination=%s')
    } catch (error) {
      logger.warn('Could not register bitcoin protocol handler')
    }
  }
</script>

<svelte:head>
  <title>{$translate('app.titles.home')}</title>
</svelte:head>

<div in:fade class="h-full w-full flex flex-col items-center justify-center relative">
  <div class="w-24 absolute top-2 left-2">
    <ClamsLogo disableAnimation />
  </div>

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
