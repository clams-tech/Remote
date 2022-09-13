<script lang="ts">
  import { fade } from 'svelte/transition'
  import { translate } from '$lib/i18n/translations'
  import QRIcon from '$lib/icons/Qr.svelte'
  import ArrowIcon from '$lib/icons/Arrow.svelte'
  import ClamsLogo from '$lib/icons/ClamsLogo.svelte'
  import { funds$, nodeInfo$, settings$ } from '$lib/streams'
  import { calculateBalance } from '$lib/utils'
  import Spinner from '$lib/elements/Spinner.svelte'
  import Value from '$lib/components/Value.svelte'
  import { convertValue } from '$lib/conversion'
  import { BitcoinDenomination } from '$lib/types'
  import Settings from '$lib/icons/Settings.svelte'
  import RecentPayment from '$lib/components/RecentPayment.svelte'

  const buttons = [
    { key: 'send', icon: ArrowIcon, props: { direction: 'up' } },
    { key: 'scan', icon: QRIcon, props: {} },
    { key: 'receive', icon: ArrowIcon, props: {} }
  ]

  $: balanceMsat = $funds$.data && calculateBalance($funds$.data)

  $: balancePrimaryDenom =
    balanceMsat &&
    convertValue({
      value: balanceMsat,
      from: BitcoinDenomination.msats,
      to: $settings$.primaryDenomination
    })
</script>

<svelte:head>
  <title>{$translate('app.titles.home')}</title>
</svelte:head>

<div in:fade class="h-full w-full flex flex-col items-center justify-center relative">
  <a href="/settings">
    <div class="w-8 absolute top-4 right-4">
      <Settings />
    </div>
  </a>

  <div class="w-24 absolute top-2 left-2">
    <ClamsLogo />
  </div>

  {#if $nodeInfo$.data}
    <span in:fade class="flex items-center"
      >{$nodeInfo$.data.alias}
      <span
        style="background-color: #{$nodeInfo$.data.color};"
        class="w-4 h-4 rounded-full ml-2"
      /></span
    >
  {/if}

  {#if $funds$.loading}
    <div in:fade class="p-6">
      <Spinner />
    </div>
  {:else if balancePrimaryDenom !== null}
    <div in:fade>
      <Value value={balancePrimaryDenom} readonly />
    </div>
  {/if}

  <div class="flex items-center justify-around w-full max-w-sm p-4 mt-4">
    {#each buttons as { key, icon, props } (key)}
      <a
        href={`/${key}`}
        class=" w-24 h-24 border rounded flex flex-col justify-center items-center"
      >
        <div class="w-8">
          <svelte:component this={icon} {...props} />
        </div>
        <div>{$translate(`app.buttons.${key}`)}</div>
      </a>
    {/each}
  </div>

  <RecentPayment />
</div>
