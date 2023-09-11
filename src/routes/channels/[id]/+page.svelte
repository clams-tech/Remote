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
  import { filter, from, map, mergeMap, switchMap, takeUntil, timer } from 'rxjs'
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
  import { truncateValue } from '$lib/utils.js'
  import channels from '$lib/icons/channels.js'
  import ErrorDetail from '$lib/components/ErrorDetail.svelte'

  export let data: PageData // channel id

  let connection: Connection
  let wallet: Wallet
  let feeBaseUpdate: number
  let feeRateUpdate: number
  let minForwardUpdate: number
  let maxForwardUpdate: number
  let loaded = false
  let couldNotFindChannel: boolean

  const channel$ = from(
    liveQuery(() =>
      db.channels.get(data.id).then((channel) => {
        couldNotFindChannel = !channel
        return channel
      })
    )
  )

  const closingTransaction$ = channel$.pipe(
    filter((x) => !!x),
    mergeMap((channel) =>
      db.transactions
        .where({ 'channel.id': channel!.id })
        .filter(({ channel }) => channel?.type === 'force_close' || channel?.type === 'close')
        .first()
    )
  )

  $: if ($channel$) {
    loadData()
  }

  const loadData = async () => {
    connection = $connections$.find((conn) => conn.walletId === $channel$!.walletId) as Connection
    wallet = (await db.wallets.get($channel$!.walletId)) as Wallet

    const { feeBase, feePpm, htlcMin, htlcMax } = $channel$ as Channel

    if (typeof feeBase === 'number') {
      feeBaseUpdate = feeBase
    }

    if (typeof feePpm === 'number') {
      feeRateUpdate = feePpm
    }

    if (typeof htlcMin === 'number') {
      minForwardUpdate = htlcMin
    }

    if (typeof htlcMax === 'number') {
      maxForwardUpdate = htlcMax
    }

    loaded = true
  }

  timer(5000, 10000)
    .pipe(
      filter(() => !!$channel$),
      switchMap(async () => {
        return connection.channels?.get({ id: $channel$!.id, peerId: $channel$!.peerId! })
      }),
      filter((x) => !!x),
      map((update) => update && update[0]),
      takeUntil(onDestroy$)
    )
    .subscribe((channelUpdate) => {
      db.channels.update(data.id, channelUpdate!)
    })

  let showFeeUpdateModal = false
  let updating = false
  let requestError: AppError | null = null

  async function updateFees() {
    requestError = null
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

      await db.channels.update(data.id, {
        ...$channel$,
        feeBase,
        feePpm: feeRateUpdate,
        htlcMin,
        htlcMax
      })
    } catch (error) {
      requestError = error as AppError
    } finally {
      updating = false
      showFeeUpdateModal = false
    }
  }

  let connecting = false

  async function connectPeer() {
    connecting = true
    requestError = null

    try {
      await connection.channels?.connect!({ id: $channel$!.peerId! })
      db.channels.update(data.id, { peerConnected: true })
    } catch (error) {
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
    {#if couldNotFindChannel}
      <div class="mt-4">
        <Msg message={$translate('app.errors.could_not_find_channel')} type="error" />
      </div>
    {:else if !loaded}
      <Spinner />
    {:else if $channel$}
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
        finalToUs,
        walletId
      } = $channel$}

      <div>
        <div class="w-full flex justify-center items-center text-3xl font-semibold">
          <div class="w-8 mr-1.5">{@html channels}</div>
          <div class="flex items-center gap-x-2">
            <div>
              {$translate('app.labels.channel_with')}
            </div>
            <div class="text-purple-200">
              {peerAlias || $translate('app.labels.unknown')}
            </div>
          </div>
        </div>
        <div class="flex items-center w-full justify-center text-2xl">
          <div class="flex flex-col items-end">
            <BitcoinAmount sats={balanceLocal + balanceRemote} />
            <div class="text-xs font-semibold">capacity</div>
          </div>
        </div>
      </div>

      <div class="flex flex-col w-full overflow-hidden justify-center items-center mt-2">
        <div class="flex flex-col w-full flex-grow overflow-auto max-w-lg">
          <SummaryRow>
            <div slot="label">
              {$translate('app.labels.wallet')}:
            </div>
            <div slot="value">
              {#await db.wallets.get(walletId) then wallet}
                {#if wallet}
                  <a class="flex items-center no-underline" href={`/wallets/${wallet.id}`}>
                    {wallet.label}
                    <div class="w-4 -rotate-90">{@html caret}</div>
                  </a>
                {:else}
                  {$translate('app.labels.unknown')}
                {/if}
              {/await}
            </div>
          </SummaryRow>

          {#if peerId}
            <SummaryRow>
              <div slot="label">
                {$translate('app.labels.peer_id')}:
              </div>
              <div slot="value">
                <CopyValue value={peerId} truncateLength={8} />
              </div>
            </SummaryRow>
          {/if}

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

          {#if $closingTransaction$}
            <SummaryRow>
              <div slot="label">
                {$translate('app.labels.closing_transaction')}:
              </div>
              <div slot="value">
                <a href={`/transactions/${$closingTransaction$.id}`} class="flex items-center"
                  >{truncateValue($closingTransaction$.id)}
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

  {#if requestError}
    <div in:slide|local={{ duration: 250 }} class="mt-2">
      <ErrorDetail error={requestError} />
    </div>
  {/if}
</Section>

{#if showFeeUpdateModal}
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
    </div>
  </Modal>
{/if}
