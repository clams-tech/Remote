<script lang="ts">
  import { slide } from 'svelte/transition'
  import { connections$, onDestroy$ } from '$lib/streams'
  import { translate } from '$lib/i18n/translations'
  import type { PageData } from './$types'
  import CopyValue from '$lib/components/CopyValue.svelte'
  import SummaryRow from '$lib/components/SummaryRow.svelte'
  import Spinner from '$lib/components/Spinner.svelte'
  import Button from '$lib/components/Button.svelte'
  import Modal from '$lib/components/Modal.svelte'
  import TextInput from '$lib/components/TextInput.svelte'
  import edit from '$lib/icons/edit.js'
  import { filter, map, switchMap, takeUntil, timer } from 'rxjs'
  import type { Channel } from '$lib/@types/channels.js'
  import { liveQuery } from 'dexie'
  import { db } from '$lib/db.js'
  import type { Connection } from '$lib/wallets/interfaces.js'
  import connect from '$lib/icons/connect.js'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import Msg from '$lib/components/Msg.svelte'
  import Section from '$lib/components/Section.svelte'
  import type { AppError } from '$lib/@types/errors.js'
  import caret from '$lib/icons/caret.js'
  import type { Wallet } from '$lib/@types/wallets.js'
  import type { Transaction } from '$lib/@types/transactions.js'
  import { truncateValue } from '$lib/utils.js'

  export let data: PageData // channel id
  const channels$ = liveQuery(() => db.channels.toArray())

  let channel: Channel
  let connection: Connection
  let wallet: Wallet
  let feeBaseUpdate: number
  let feeRateUpdate: number
  let minForwardUpdate: number
  let maxForwardUpdate: number
  let closingTransaction: Transaction

  let loaded = false

  $: if ($channels$) {
    findChannel()
  }

  async function findChannel() {
    channel = $channels$.find((p) => p.id === data.id)!

    if (channel) {
      connection = $connections$.find((conn) => conn.walletId === channel.walletId) as Connection
      wallet = (await db.wallets.get(channel.walletId)) as Wallet

      closingTransaction = (await db.transactions
        .where('channel.id')
        .equals(channel.id)
        .filter(({ channel }) => channel?.type === 'force_close' || channel?.type === 'close')
        .first()) as Transaction

      const { feeBase, feePpm, htlcMin, htlcMax } = channel

      if (feeBase) {
        feeBaseUpdate = feeBase
      }

      if (feePpm) {
        feeRateUpdate = feePpm
      }

      if (htlcMin) {
        minForwardUpdate = htlcMin
      }

      if (htlcMax) {
        maxForwardUpdate = htlcMax
      }
    }

    loaded = true
  }

  timer(5000, 10000)
    .pipe(
      filter(() => !!channel),
      switchMap(async () => {
        return connection.channels?.get({ id: channel!.id, peerId: channel!.peerId! })
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
      const feeBase = feeBaseUpdate
      const htlcMin = minForwardUpdate
      const htlcMax = maxForwardUpdate

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
      await connection.channels?.connect!({ id: channel.peerId! })
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
  <title>{$translate('app.routes./channel.title')}</title>
</svelte:head>

<Section>
  <div class="w-full flex flex-col items-center">
    {#if !loaded}
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
        htlcMax,
        closer,
        finalToUs
      } = channel}

      <div class="flex flex-col items-center mb-4">
        <div class="text-2xl font-semibold">{peerAlias || $translate('app.labels.channel')}</div>
        {#if peerId}
          <div class="text-sm pl-2">
            <CopyValue value={peerId} truncateLength={8} />
          </div>
        {/if}
      </div>

      <div class="flex flex-col w-full overflow-hidden justify-center items-center">
        <div class="flex flex-col w-full flex-grow overflow-auto max-w-lg">
          <SummaryRow>
            <div slot="label">
              {$translate('app.labels.state')}:
            </div>
            <div
              slot="value"
              class:text-utility-success={status === 'active'}
              class:text-utility-pending={status === 'opening'}
              class:text-utility-error={status === 'closing' || status === 'closed'}
            >
              {$translate(`app.labels.${status}`)}
            </div>
          </SummaryRow>

          {#if status !== 'closed'}
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

                {#if !peerConnected && peerId}
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
          {/if}

          <SummaryRow>
            <div slot="label">
              {$translate('app.labels.opened_by')}:
            </div>
            <div slot="value">
              {#if opener === 'local'}
                <a href={`/wallets/${wallet.id}`} class="flex items-center"
                  >{wallet.label}
                  <div class="w-4 -rotate-90">{@html caret}</div>
                </a>
              {:else}
                {peerAlias || $translate('app.labels.remote')}
              {/if}
            </div>
          </SummaryRow>

          {#if closer}
            <SummaryRow>
              <div slot="label">
                {$translate('app.labels.closed_by')}:
              </div>
              <div slot="value">
                {#if closer === 'local'}
                  <a href={`/wallets/${wallet.id}`} class="flex items-center"
                    >{wallet.label}
                    <div class="w-4 -rotate-90">{@html caret}</div>
                  </a>
                {:else}
                  {peerAlias || $translate('app.labels.remote')}
                {/if}
              </div>
            </SummaryRow>
          {/if}

          {#if closingTransaction}
            <SummaryRow>
              <div slot="label">
                {$translate('app.labels.closing_transaction')}:
              </div>
              <div slot="value">
                <a href={`/transactions/${closingTransaction.id}`} class="flex items-center"
                  >{truncateValue(closingTransaction.id)}
                  <div class="w-4 -rotate-90">{@html caret}</div>
                </a>
              </div>
            </SummaryRow>
          {/if}

          {#if finalToUs}
            <SummaryRow>
              <div slot="label">
                {$translate('app.labels.final_to_us')}:
              </div>
              <div slot="value">
                <BitcoinAmount sats={finalToUs} />
              </div>
            </SummaryRow>
          {/if}

          {#if status !== 'closed'}
            <SummaryRow>
              <div slot="label">
                {$translate('app.labels.outbound')}:
              </div>
              <div slot="value">
                <BitcoinAmount sats={balanceLocal} />
              </div>
            </SummaryRow>

            <SummaryRow>
              <div slot="label">
                {$translate('app.labels.inbound')}:
              </div>
              <div slot="value">
                <BitcoinAmount sats={balanceRemote} />
              </div>
            </SummaryRow>

            {#if htlcs}
              <SummaryRow>
                <div slot="label">
                  {$translate('app.labels.unsettled')}:
                </div>
                <div slot="value">
                  <BitcoinAmount sats={htlcs.reduce((acc, { amount }) => acc + amount, 0)} />
                </div>
              </SummaryRow>
            {/if}

            <SummaryRow>
              <div slot="label">
                {$translate('app.labels.local_reserve')}:
              </div>
              <div slot="value">
                <BitcoinAmount sats={reserveLocal} />
              </div>
            </SummaryRow>

            <SummaryRow>
              <div slot="label">
                {$translate('app.labels.remote_reserve')}:
              </div>
              <div slot="value">
                <BitcoinAmount sats={reserveRemote} />
              </div>
            </SummaryRow>

            {#if feeBase}
              <SummaryRow>
                <div slot="label">
                  {$translate('app.labels.fee_base')}:
                </div>
                <div slot="value">
                  <BitcoinAmount sats={feeBase} />
                </div>
              </SummaryRow>
            {/if}

            {#if feePpm}
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
            {/if}

            {#if htlcMin}
              <SummaryRow>
                <div slot="label">
                  {$translate('app.labels.min_forward')}:
                </div>
                <div slot="value">
                  <BitcoinAmount sats={htlcMin} />
                </div>
              </SummaryRow>
            {/if}

            {#if htlcMax}
              <SummaryRow>
                <div slot="label">
                  {$translate('app.labels.max_forward')}:
                </div>
                <div slot="value">
                  <BitcoinAmount sats={htlcMax} />
                </div>
              </SummaryRow>
            {/if}
          {/if}
        </div>
      </div>

      {#if status !== 'closed' && connection && connection.channels?.update}
        <div class="flex w-full justify-end mt-4 max-w-lg">
          <div class="w-min">
            <Button
              on:click={() => (showFeeUpdateModal = true)}
              text={$translate('app.labels.update_settings')}
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
