<script lang="ts">
  import { fade, slide } from 'svelte/transition'
  import { connections$, onDestroy$ } from '$lib/streams'
  import { translate } from '$lib/i18n/translations'
  import type { PageData } from './$types'
  import CopyValue from '$lib/components/CopyValue.svelte'
  import SummaryRow from '$lib/components/SummaryRow.svelte'
  import Spinner from '$lib/components/Spinner.svelte'
  import { channelStatusTolabel } from '../utils.js'
  import Big from 'big.js'
  import Button from '$lib/components/Button.svelte'
  import Modal from '$lib/components/Modal.svelte'
  import TextInput from '$lib/components/TextInput.svelte'
  import edit from '$lib/icons/edit.js'
  import { filter, map, switchMap, takeUntil, timer } from 'rxjs'
  import type { Channel } from '$lib/@types/channels.js'
  import { liveQuery } from 'dexie'
  import { db } from '$lib/db.js'
  import type { ConnectionInterface } from '$lib/connections/interfaces.js'
  import connect from '$lib/icons/connect.js'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import Msg from '$lib/components/Msg.svelte'
  import Section from '$lib/components/Section.svelte'
  import channels from '$lib/icons/channels.js'
  import type { AppError } from '$lib/@types/errors.js'

  export let data: PageData // channel id
  const channels$ = liveQuery(() => db.channels.toArray())

  let channel: Channel
  let connection: ConnectionInterface

  let feeBaseUpdate: number
  let feeRateUpdate: number
  let minForwardUpdate: number
  let maxForwardUpdate: number

  $: if ($channels$) {
    findChannel()
  }

  function findChannel() {
    channel = $channels$.find((p) => p.id === data.id)!

    if (channel) {
      connection = $connections$.find(
        (conn) => conn.connectionId === channel.connectionId
      ) as ConnectionInterface

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

  timer(5000, 10000)
    .pipe(
      filter(() => !!channel),
      switchMap(async () => {
        return connection.channels?.get({ id: channel!.id, peerId: channel!.peerId })
      }),
      map((update) => update && update[0]),
      takeUntil(onDestroy$)
    )
    .subscribe((channelUpdate) => {
      channel = channelUpdate!
    })

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

      await connection.channels?.update!({
        id: data.id,
        feeBase,
        feeRate: feeRateUpdate,
        htlcMin,
        htlcMax
      })

      await db.channels.update(channel.id, {
        ...channel,
        feeBase,
        feePpm: feeRateUpdate,
        htlcMin,
        htlcMax
      })

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
    errMsg = ''

    try {
      await connection.channels?.connect!({ id: channel.peerId })
      channel.peerConnected = true
    } catch (error) {
      const { key } = error as AppError
      errMsg = $translate(`app.errors.${key}`)
    } finally {
      connecting = false
    }
  }
</script>

<svelte:head>
  <title>{$translate('app.titles./channel')}</title>
</svelte:head>

<Section>
  <div class="w-full flex flex-col items-center">
    {#if !$channels$}
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

      <div class="flex flex-col w-full overflow-hidden justify-center items-center">
        <div class="flex flex-col w-full flex-grow overflow-auto max-w-lg">
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
                  {#if !connecting && connection && connection.channels?.connect}
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
                ? connection?.info?.alias || $translate('app.labels.us')
                : peerAlias || $translate('app.labels.remote')}
            </div>
          </SummaryRow>

          <SummaryRow>
            <div slot="label">
              {$translate('app.labels.outbound')}:
            </div>
            <div slot="value">
              <BitcoinAmount msat={balanceLocal} />
            </div>
          </SummaryRow>

          <SummaryRow>
            <div slot="label">
              {$translate('app.labels.inbound')}:
            </div>
            <div slot="value">
              <BitcoinAmount msat={balanceRemote} />
            </div>
          </SummaryRow>

          <SummaryRow>
            <div slot="label">
              {$translate('app.labels.unsettled')}:
            </div>
            <div slot="value">
              <BitcoinAmount
                msat={htlcs.reduce((acc, { amount }) => acc.add(amount), Big(0)).toString()}
              />
            </div>
          </SummaryRow>

          <SummaryRow>
            <div slot="label">
              {$translate('app.labels.local_reserve')}:
            </div>
            <div slot="value">
              <BitcoinAmount msat={reserveLocal} />
            </div>
          </SummaryRow>

          <SummaryRow>
            <div slot="label">
              {$translate('app.labels.remote_reserve')}:
            </div>
            <div slot="value">
              <BitcoinAmount msat={reserveRemote} />
            </div>
          </SummaryRow>

          {#if feeBase}
            <SummaryRow>
              <div slot="label">
                {$translate('app.labels.fee_base')}:
              </div>
              <div slot="value">
                <BitcoinAmount msat={feeBase} />
              </div>
            </SummaryRow>
          {/if}

          <SummaryRow>
            <div slot="label">
              {$translate('app.labels.fee_rate')}:
            </div>
            <div slot="value" class="flex items-baseline">
              <span class="font-mono">{feePpm}</span>
              <span
                class="text-[0.75em] font-semibold text-neutral-50 flex items-end leading-none ml-1"
              >
                {$translate('app.labels.ppm')}
              </span>
            </div>
          </SummaryRow>

          {#if htlcMin}
            <SummaryRow>
              <div slot="label">
                {$translate('app.labels.min_forward')}:
              </div>
              <div slot="value">
                <BitcoinAmount msat={htlcMin} />
              </div>
            </SummaryRow>
          {/if}

          {#if htlcMax}
            <SummaryRow>
              <div slot="label">
                {$translate('app.labels.max_forward')}:
              </div>
              <div slot="value">
                <BitcoinAmount msat={htlcMax} />
              </div>
            </SummaryRow>
          {/if}
        </div>
      </div>

      {#if connection && connection.channels?.update}
        <div class="flex w-full justify-end mt-4 max-w-lg">
          <div class="w-min">
            <Button
              on:click={() => (showFeeUpdateModal = true)}
              text={$translate('app.labels.update_channel_settings')}
            >
              <div slot="iconLeft" class="w-6 mr-1 -ml-2">{@html edit}</div>
            </Button>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</Section>

{#if showFeeUpdateModal && channel}
  <Modal on:close={() => (showFeeUpdateModal = false)}>
    <div class="w-[25rem] max-w-full gap-y-4 flex flex-col overflow-hidden h-full">
      <h4 class="font-semibold mb-2 w-full text-2xl">{$translate('app.labels.channel_fees')}</h4>

      <div class="flex flex-col flex-grow overflow-auto p-1 gap-y-4">
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
          <Msg type="error" message={errMsg} />
        </div>
      {/if}
    </div>
  </Modal>
{/if}
