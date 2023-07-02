<script lang="ts">
  import { fade } from 'svelte/transition'
  import { channels$, lastPath$, settings$ } from '$lib/streams'
  import { goto } from '$app/navigation'
  import BackButton from '$lib/elements/BackButton.svelte'
  import { loading, translate } from '$lib/i18n/translations'
  import type { PageData } from './$types'
  import CopyValue from '$lib/elements/CopyValue.svelte'
  import SummaryRow from '$lib/elements/SummaryRow.svelte'
  import Spinner from '$lib/elements/Spinner.svelte'
  import { channelStatusTolabel } from '../utils.js'
  import { BitcoinDenomination, type Channel } from '$lib/types.js'
  import { formatValueForDisplay } from '$lib/utils.js'
  import { convertValue } from '$lib/conversion.js'
  import { currencySymbols } from '$lib/constants.js'
  import Big from 'big.js'

  export let data: PageData // channel id

  let channel: Channel | null

  $: if ($channels$.data) {
    channel = $channels$.data.find((p) => p.id === data.id) || null
  }

  const backPath = getBackPath()

  function back() {
    if (backPath !== '/') {
      lastPath$.next('/')
    }

    goto(backPath)
  }

  function getBackPath() {
    const path = lastPath$.value
    return path === '/send' || path === '/receive' || path === '/scan' || path.includes('/offers/')
      ? '/'
      : path
  }

  $: primarySymbol = currencySymbols[$settings$.primaryDenomination]
</script>

<svelte:head>
  <title>{$translate('app.titles./channel')}</title>
</svelte:head>

<section
  in:fade|local={{ duration: 250 }}
  class="flex flex-col justify-center items-center h-full w-full max-w-lg"
>
  <BackButton on:click={back} text={$translate(`app.titles.${backPath}`)} />

  {#if $channels$.loading}
    <Spinner />
  {:else if channel}
    {@const {
      peerAlias,
      peerId,
      status,
      balanceLocal,
      balanceRemote,
      reserveLocal,
      reserveRemote,
      htlcs,
      feeBase,
      feePpm
    } = channel}

    {@const channelStatusLabel = channelStatusTolabel(status)}
    <div class="flex flex-col items-center mb-4">
      <div class="text-lg font-semibold">{peerAlias}</div>
      <div class="text-sm pl-2">
        <CopyValue value={peerId} truncateLength={8} />
      </div>
    </div>

    <SummaryRow>
      <div slot="label">
        {$translate('app.labels.status')}:
      </div>
      <div
        slot="value"
        class:text-utility-success={channelStatusLabel === 'active'}
        class:text-utility-pending={channelStatusLabel === 'pending'}
        class:text-utility-error={channelStatusLabel === 'closing' ||
          channelStatusLabel === 'closed'}
      >
        <div>
          {$translate(`app.labels.${channelStatusLabel}`)}
        </div>
      </div>
    </SummaryRow>

    <SummaryRow>
      <div slot="label">
        {$translate('app.labels.outbound')}:
      </div>
      <div slot="value" class="flex items-center">
        <span
          class="flex justify-center items-center"
          class:w-4={primarySymbol.startsWith('<')}
          class:mr-[2px]={!primarySymbol.startsWith('<')}>{@html primarySymbol}</span
        >
        {formatValueForDisplay({
          value: convertValue({
            value: balanceLocal,
            from: BitcoinDenomination.msats,
            to: $settings$.primaryDenomination
          }),
          denomination: $settings$.primaryDenomination,
          commas: true
        })}
      </div>
    </SummaryRow>

    <SummaryRow>
      <div slot="label">
        {$translate('app.labels.inbound')}:
      </div>
      <div slot="value" class="flex items-center">
        <span
          class="flex justify-center items-center"
          class:w-4={primarySymbol.startsWith('<')}
          class:mr-[2px]={!primarySymbol.startsWith('<')}>{@html primarySymbol}</span
        >
        {formatValueForDisplay({
          value: convertValue({
            value: balanceRemote,
            from: BitcoinDenomination.msats,
            to: $settings$.primaryDenomination
          }),
          denomination: $settings$.primaryDenomination,
          commas: true
        })}
      </div>
    </SummaryRow>

    <SummaryRow>
      <div slot="label">
        {$translate('app.labels.unsettled')}:
      </div>
      <div slot="value" class="flex items-center">
        <span
          class="flex justify-center items-center"
          class:w-4={primarySymbol.startsWith('<')}
          class:mr-[2px]={!primarySymbol.startsWith('<')}>{@html primarySymbol}</span
        >
        {formatValueForDisplay({
          value: convertValue({
            value: htlcs.reduce((acc, { amount }) => acc.add(amount), Big(0)).toString(),
            from: BitcoinDenomination.msats,
            to: $settings$.primaryDenomination
          }),
          denomination: $settings$.primaryDenomination,
          commas: true
        })}
      </div>
    </SummaryRow>

    <SummaryRow>
      <div slot="label">
        {$translate('app.labels.local_reserve')}:
      </div>
      <div slot="value" class="flex items-center">
        <span
          class="flex justify-center items-center"
          class:w-4={primarySymbol.startsWith('<')}
          class:mr-[2px]={!primarySymbol.startsWith('<')}>{@html primarySymbol}</span
        >
        {formatValueForDisplay({
          value: convertValue({
            value: reserveLocal,
            from: BitcoinDenomination.msats,
            to: $settings$.primaryDenomination
          }),
          denomination: $settings$.primaryDenomination,
          commas: true
        })}
      </div>
    </SummaryRow>

    <SummaryRow>
      <div slot="label">
        {$translate('app.labels.remote_reserve')}:
      </div>
      <div slot="value" class="flex items-center">
        <span
          class="flex justify-center items-center"
          class:w-4={primarySymbol.startsWith('<')}
          class:mr-[2px]={!primarySymbol.startsWith('<')}>{@html primarySymbol}</span
        >
        {formatValueForDisplay({
          value: convertValue({
            value: reserveRemote,
            from: BitcoinDenomination.msats,
            to: $settings$.primaryDenomination
          }),
          denomination: $settings$.primaryDenomination,
          commas: true
        })}
      </div>
    </SummaryRow>

    <SummaryRow>
      <div slot="label">
        {$translate('app.labels.fee_base')}:
      </div>
      <div slot="value" class="flex items-center">
        {formatValueForDisplay({
          value: feeBase,
          denomination: BitcoinDenomination.msats,
          commas: true
        })}

        {$translate('app.labels.msat')}
      </div>
    </SummaryRow>

    <SummaryRow>
      <div slot="label">
        {$translate('app.labels.fee_rate')}:
      </div>
      <div slot="value" class="flex items-center">
        {feePpm}
        {$translate('app.labels.ppm')}
      </div>
    </SummaryRow>
  {/if}
</section>
