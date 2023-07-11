<script lang="ts">
  import { fade } from 'svelte/transition'
  import { translate } from '$lib/i18n/translations'
  import { auth$, funds$, nodeInfo$, settings$ } from '$lib/streams'
  import { calculateBalance, isPWA, logger } from '$lib/utils'
  import Spinner from '$lib/elements/Spinner.svelte'
  import Value from '$lib/components/Value.svelte'
  import { convertValue } from '$lib/conversion'
  import { BitcoinDenomination } from '$lib/types'
  import RecentPayment from '$lib/components/RecentPayment.svelte'
  import arrow from '$lib/icons/arrow'
  import Nav from '$lib/components/Nav.svelte'
  import Refresh from '$lib/components/Refresh.svelte'
  import { browser } from '$app/environment'
  import scan from '$lib/icons/scan'
  import CopyValue from '$lib/elements/CopyValue.svelte'
  import key from '$lib/icons/key.js'
  import Modal from '$lib/elements/Modal.svelte'
  import Qr from '$lib/components/QR.svelte'
  import info from '$lib/icons/info.js'

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

  if (browser && !isPWA()) {
    try {
      logger.info('Attempting to register protocol handler')
      navigator.registerProtocolHandler('bitcoin', '/send?destination=%s')
    } catch (error) {
      logger.warn('Could not register bitcoin protocol handler')
    }
  }

  let showNodeInfoModal = false
  let nodeAddress: string

  $: if ($nodeInfo$.data && $nodeInfo$.data.address[0]) {
    const {
      id,
      address: [{ address, port }]
    } = $nodeInfo$.data
    nodeAddress = `${id}@${address}:${port}`
  } else {
    nodeAddress = $auth$!.address
  }
</script>

<svelte:head>
  <title>{$translate('app.titles./')}</title>
</svelte:head>

<Nav />

<div
  in:fade|local={{ duration: 250 }}
  class="h-full w-full flex flex-col items-center justify-center relative md:tall:pl-28"
>
  <div class="w-full max-w-lg p-4">
    {#if $nodeInfo$.data}
      <div
        in:fade|local={{ duration: 250 }}
        class="flex items-center w-full justify-center text-xl p-4"
      >
        <Refresh />

        <div class="ml-2 mt-[2px] flex items-center">
          <b>{$nodeInfo$.data.alias}</b>

          <button
            on:click={() => (showNodeInfoModal = true)}
            class="w-6 ml-2 mb-[2px] border-2 border-current rounded-full flex items-center justify-center"
          >
            {@html info}
          </button>
        </div>
      </div>
    {/if}

    {#if $funds$.loading && !$funds$.data}
      <div in:fade|local={{ duration: 250 }} class="p-4">
        <Spinner />
      </div>
    {:else}
      <div in:fade|local={{ duration: 250 }}>
        <Value primary={balancePrimaryDenom} secondary={balanceSecondaryDenom} readonly />
      </div>
    {/if}

    <div class="grid grid-cols-3 gap-2 xs:gap-4 w-full p-y mt-4">
      {#each buttons as { key, icon, styles } (key)}
        <a
          href={`/${key}`}
          class="aspect-square border rounded flex flex-col justify-center items-center dark:hover:bg-neutral-800/40 hover:bg-neutral-50/50 transition-all"
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

{#if showNodeInfoModal && $nodeInfo$.data}
  {@const {
    data: { id, address }
  } = $nodeInfo$}
  <Modal on:close={() => (showNodeInfoModal = false)}>
    <h4 class="font-semibold mb-2 w-full text-3xl">
      {$nodeInfo$.data?.alias}
    </h4>

    <div class="mb-4 w-full flex justify-start font-semibold">
      <CopyValue value={id} truncateLength={12} icon={key} />
    </div>

    <div class="mb-8">
      <Qr value={nodeAddress} />
    </div>
  </Modal>
{/if}
