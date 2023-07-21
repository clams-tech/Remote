<script lang="ts">
  import { fade, slide } from 'svelte/transition'
  import { channels$, lastPath$, nodeInfo$, onDestroy$, settings$ } from '$lib/streams'
  import { goto } from '$app/navigation'
  import BackButton from '$lib/elements/BackButton.svelte'
  import { translate } from '$lib/i18n/translations'
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
  import Button from '$lib/elements/Button.svelte'
  import Modal from '$lib/elements/Modal.svelte'
  import TextInput from '$lib/elements/TextInput.svelte'
  import edit from '$lib/icons/edit.js'
  import lightning from '$lib/lightning.js'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'
  import { filter, map, switchMap, takeUntil, timer } from 'rxjs'
  import connect from '$lib/icons/connect.js'

  export let data: PageData // channel id

  let channel: Channel

  let feeBaseUpdate: number
  let feeRateUpdate: number
  let minForwardUpdate: number
  let maxForwardUpdate: number

  $: if ($channels$.data) {
    findChannel()
  }

  function findChannel() {
    channel = $channels$.data!.find((p) => p.id === data.id)!

    if (channel) {
      const { feeBase, feePpm, htlcMin, htlcMax } = channel

      if (feeBase) {
        feeBaseUpdate = Big(feeBase).div(1000).toNumber()
      }

      if (feePpm) {
        feeRateUpdate = feePpm
      }

      if (htlcMin) {
        minForwardUpdate = Big(htlcMin).div(1000).toNumber()
      }

      if (htlcMax) {
        maxForwardUpdate = Big(htlcMax).div(1000).toNumber()
      }
    }
  }

  const lnApi = lightning.getLn()

  timer(5000, 10000)
    .pipe(
      filter(() => !!channel),
      switchMap(() => lnApi.getChannels(channel.peerId, channel.id)),
      map(([update]) => update),
      takeUntil(onDestroy$)
    )
    .subscribe((channelUpdate) => {
      channel = channelUpdate
    })

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

  let showFeeUpdateModal = false
  let updating = false
  let errMsg = ''

  async function updateFees() {
    errMsg = ''
    updating = true

    try {
      const feeBase = Big(feeBaseUpdate).times(1000).toString()
      const htlcMin = Big(minForwardUpdate).times(1000).toString()
      const htlcMax = Big(maxForwardUpdate).times(1000).toString()

      await lnApi.updateChannel({
        id: data.id,
        feeBase,
        feeRate: feeRateUpdate,
        htlcMin,
        htlcMax
      })

      const updatedChannels = (channels$.value.data || []).map((channel) =>
        channel.id === data.id
          ? { ...channel, feeBase, feePpm: feeRateUpdate, htlcMin, htlcMax }
          : channel
      )

      channels$.next({ data: updatedChannels })
      showFeeUpdateModal = false
    } catch (error) {
      const { message } = error as { message: string }
      errMsg = message
    } finally {
      updating = false
    }
  }

  let connecting = false

  async function connectPeer() {
    connecting = true

    try {
      await lnApi.connectPeer({ id: channel.peerId })
      channel.peerConnected = true
    } catch (error) {
      // @TODO - Could display error here?
    } finally {
      connecting = false
    }
  }
</script>

<svelte:head>
  <title>{$translate('app.titles./channel')}</title>
</svelte:head>

<section
  in:fade|local={{ duration: 250 }}
  class="flex flex-col justify-center items-center w-full max-w-lg p-4 overflow-hidden xs:pb-8"
>
  <BackButton on:click={back} text={$translate(`app.titles.${backPath}`)} />

  <div class="h-16" />

  {#if $channels$.loading}
    <Spinner />
  {:else if channel}
    {@const {
      peerAlias,
      peerId,
      peerConnected,
      status,
      balanceLocal,
      balanceRemote,
      reserveLocal,
      reserveRemote,
      htlcs,
      feeBase,
      feePpm,
      opener,
      htlcMin,
      htlcMax
    } = channel}

    {@const channelStatusLabel = channelStatusTolabel(status)}

    <div class="flex flex-col items-center mb-4">
      <div class="text-xl font-semibold">{peerAlias || $translate('app.labels.channel')}</div>
      <div class="text-sm pl-2">
        <CopyValue value={peerId} truncateLength={8} />
      </div>
    </div>

    <div class="flex flex-col w-full overflow-hidden flex-grow">
      <div class="flex flex-col w-full flex-grow overflow-auto">
        <SummaryRow>
          <div slot="label">
            {$translate('app.labels.state')}:
          </div>
          <div
            slot="value"
            class:text-utility-success={channelStatusLabel === 'active'}
            class:text-utility-pending={channelStatusLabel === 'pending'}
            class:text-utility-error={channelStatusLabel === 'closing' ||
              channelStatusLabel === 'closed'}
          >
            {$translate(`app.labels.${channelStatusLabel}`)}
          </div>
        </SummaryRow>

        <SummaryRow>
          <div slot="label">
            {$translate('app.labels.peer_connection')}:
          </div>
          <div
            class="flex items-center"
            slot="value"
            class:text-utility-success={peerConnected}
            class:text-utility-error={!peerConnected}
            class:text-utility-pending={connecting}
          >
            {$translate(
              `app.labels.${
                connecting ? 'connecting' : peerConnected ? 'connected' : 'disconnected'
              }`
            )}

            {#if !peerConnected}
              <div class="ml-2">
                {#if !connecting}
                  <button on:click={connectPeer} class="w-6 block">{@html connect}</button>
                {:else}
                  <Spinner size="1rem" />
                {/if}
              </div>
            {/if}
          </div>
        </SummaryRow>

        <SummaryRow>
          <div slot="label">
            {$translate('app.labels.opened_by')}:
          </div>
          <div slot="value">
            {opener === 'local'
              ? $nodeInfo$.data?.alias || $translate('app.labels.us')
              : peerAlias || $translate('app.labels.remote')}
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
            <span
              class="flex justify-center items-center"
              class:w-4={primarySymbol.startsWith('<')}
              class:mr-[2px]={!primarySymbol.startsWith('<')}>{@html primarySymbol}</span
            >
            {formatValueForDisplay({
              value: convertValue({
                value: feeBase,
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
            {$translate('app.labels.fee_rate')}:
          </div>
          <div slot="value" class="flex items-center">
            {feePpm}
            {$translate('app.labels.ppm')}
          </div>
        </SummaryRow>

        {#if htlcMin}
          <SummaryRow>
            <div slot="label">
              {$translate('app.labels.min_forward')}:
            </div>
            <div slot="value" class="flex items-center">
              <span
                class="flex justify-center items-center"
                class:w-4={primarySymbol.startsWith('<')}
                class:mr-[2px]={!primarySymbol.startsWith('<')}>{@html primarySymbol}</span
              >
              {formatValueForDisplay({
                value: convertValue({
                  value: htlcMin,
                  from: BitcoinDenomination.msats,
                  to: $settings$.primaryDenomination
                }),
                denomination: $settings$.primaryDenomination,
                commas: true
              })}
            </div>
          </SummaryRow>
        {/if}

        {#if htlcMax}
          <SummaryRow>
            <div slot="label">
              {$translate('app.labels.max_forward')}:
            </div>
            <div slot="value" class="flex items-center">
              <span
                class="flex justify-center items-center"
                class:w-4={primarySymbol.startsWith('<')}
                class:mr-[2px]={!primarySymbol.startsWith('<')}>{@html primarySymbol}</span
              >
              {formatValueForDisplay({
                value: convertValue({
                  value: htlcMax,
                  from: BitcoinDenomination.msats,
                  to: $settings$.primaryDenomination
                }),
                denomination: $settings$.primaryDenomination,
                commas: true
              })}
            </div>
          </SummaryRow>
        {/if}
      </div>
    </div>

    <div class="mt-4 w-full flex items-center justify-between">
      <Button
        on:click={() => (showFeeUpdateModal = true)}
        text={$translate('app.labels.update_channel_settings')}
      >
        <div slot="iconLeft" class="w-6 mr-1">{@html edit}</div>
      </Button>
    </div>
  {/if}
</section>

{#if showFeeUpdateModal && channel}
  <Modal on:close={() => (showFeeUpdateModal = false)}>
    <div class="w-[25rem] max-w-full gap-y-4 flex flex-col overflow-hidden h-full">
      <h4 class="font-semibold mb-2 w-full text-2xl">{$translate('app.labels.channel_fees')}</h4>

      <div class="flex flex-col flex-grow overflow-auto p-1">
        <TextInput
          type="number"
          name="base"
          label={$translate('app.labels.fee_base')}
          hint={$translate('app.labels.sats')}
          bind:value={feeBaseUpdate}
        />

        <TextInput
          type="number"
          name="rate"
          label={$translate('app.labels.fee_rate')}
          hint={$translate('app.labels.ppm')}
          bind:value={feeRateUpdate}
        />

        <TextInput
          type="number"
          name="min_forward"
          label={$translate('app.labels.min_forward')}
          hint={$translate('app.labels.sats')}
          bind:value={minForwardUpdate}
        />

        <TextInput
          type="number"
          name="max_forward"
          label={$translate('app.labels.max_forward')}
          hint={$translate('app.labels.sats')}
          bind:value={maxForwardUpdate}
        />
      </div>

      <div class="mt-2">
        <Button
          requesting={updating}
          on:click={updateFees}
          text={$translate('app.labels.update')}
        />
      </div>

      {#if errMsg}
        <div in:slide|local={{ duration: 250 }} class="mt-2">
          <ErrorMsg message={errMsg} />
        </div>
      {/if}
    </div>
  </Modal>
{/if}
