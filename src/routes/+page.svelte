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
  import arrow from '$lib/icons/arrow'
  import Nav from '$lib/components/Nav.svelte'
  import Refresh from '$lib/components/Refresh.svelte'
  import lightning from '$lib/lightning'
  import { browser } from '$app/environment'
  import scan from '$lib/icons/scan'

  const buttons = [
    { key: 'send', icon: arrow, styles: 'rotate-180' },
    { key: 'scan', icon: scan, styles: '' },
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

  const lnAPI = lightning.getLn()
  const { connectionStatus$ } = lnAPI.connection

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
  <title>{$translate('app.titles./')}</title>
</svelte:head>

<Nav />

<div in:fade class="h-full w-full flex flex-col items-center justify-center relative md:tall:pl-28">
  <div class="w-full max-w-lg p-6">
    {#if $nodeInfo$.data}
      <div in:fade class="flex items-center w-full justify-center text-xl p-4">
        <Refresh />
        <div class="ml-2 mt-[2px]">{$nodeInfo$.data.alias}</div>
        <div
          class:bg-utility-success={$connectionStatus$ === 'connected'}
          class:bg-utility-pending={$connectionStatus$ === 'connecting' ||
            $connectionStatus$ === 'waiting_reconnect' ||
            !$connectionStatus$}
          class:bg-utility-error={$connectionStatus$ === 'disconnected'}
          class="w-4 h-4 rounded-full ml-2 transition-colors"
        />
      </div>
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

    <div class="grid grid-cols-3 gap-2 xs:gap-6 w-full p-y mt-4">
      {#each buttons as { key, icon, styles } (key)}
        <a
          href={`/${key}`}
          class="aspect-square border rounded flex flex-col justify-center items-center"
        >
          <div class="w-10 xs:w-12 {styles}">
            {@html icon}
          </div>
          <div class="text-base font-semi-bold">{$translate(`app.buttons.${key}`)}</div>
        </a>
      {/each}
    </div>
  </div>

  <RecentPayment />
</div>
