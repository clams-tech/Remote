<script lang="ts">
  import Button from '$lib/components/Button.svelte'
  import TextInput from '$lib/components/TextInput.svelte'
  import Toggle from '$lib/components/Toggle.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import channels from '$lib/icons/channels.js'
  import { slide } from 'svelte/transition'
  import type { PageData } from './$types.js'
  import { parseNodeAddress, validateNodeAddress } from '$lib/address.js'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import Msg from '$lib/components/Msg.svelte'
  import plus from '$lib/icons/plus.js'
  import { combineLatest, map } from 'rxjs'
  import { connections$, wallets$ } from '$lib/streams.js'
  import WalletSelector from '$lib/components/WalletSelector.svelte'
  import type { Connection } from '$lib/wallets/interfaces.js'
  import { db } from '$lib/db/index.js'
  import { goto } from '$app/navigation'
  import type { AppError } from '$lib/@types/errors.js'
  import ErrorDetail from '$lib/components/ErrorDetail.svelte'

  export let data: PageData

  const availableWallets$ = combineLatest([wallets$, connections$]).pipe(
    map(([wallets, connections]) =>
      wallets.filter(({ id }) => {
        const connection = connections.find(({ walletId }) => walletId === id)
        return !!connection?.channels?.open && !!connection?.channels?.connect
      })
    )
  )

  let selectedWalletId: string
  let address: string
  let channelSize: number
  let announce = true

  let validAddress: boolean
  let opening = false
  let openError: AppError | null

  if (data.address) {
    address = data.address
  }

  $: validAddress = validateNodeAddress(address)

  async function openChannel() {
    openError = null
    opening = true

    const { ip, publicKey, port } = parseNodeAddress(address)

    try {
      const connection = connections$.value.find(
        ({ walletId }) => walletId === selectedWalletId
      ) as Connection

      await connection.channels!.connect!({ id: publicKey, host: ip, port })

      const openChannelResult = await connection.channels!.open!({
        id: publicKey,
        amount: channelSize,
        announce
      })

      const [channel] = await connection.channels!.get({
        id: openChannelResult.id,
        peerId: publicKey
      })

      await db.channels.add(channel)

      // update transactions
      if (connection.transactions?.get) {
        connection.transactions.get().then(txs => db.transactions.bulkPut(txs))
      }

      // update utxos
      if (connection.utxos?.get) {
        connection.utxos.get().then(utxos => db.utxos.bulkPut(utxos))
      }

      await goto(`/channels/${channel.id}`)
    } catch (error) {
      openError = error as AppError
    } finally {
      opening = false
    }
  }
</script>

<Section>
  <SectionHeading icon={channels} />

  <div class="w-full flex flex-col gap-y-4 mt-2">
    {#if $availableWallets$}
      <WalletSelector
        autoSelectLast="received"
        bind:selectedWalletId
        wallets={$availableWallets$}
      />

      <TextInput
        name="address"
        type="text"
        label={$translate('app.labels.peer_address')}
        invalid={address && !validAddress ? $translate('app.labels.address_invalid') : ''}
        placeholder={$translate('app.labels.address_placeholder')}
        bind:value={address}
      />

      <TextInput
        name="amount"
        type="number"
        label={$translate('app.labels.channel_size')}
        sats={channelSize}
        bind:value={channelSize}
      />

      <div class="text-sm font-semibold text-neutral-300">
        <Toggle bind:toggled={announce}>
          <div slot="left" class="mr-2">{$translate('app.labels.announce_channel')}</div>
        </Toggle>
      </div>

      <div class="mt-2 w-full flex justify-end">
        <div class="w-min">
          <Button
            disabled={!address || !validAddress || !channelSize}
            requesting={opening}
            on:click={openChannel}
            text={$translate('app.labels.open')}
          >
            <div slot="iconLeft" class="w-6 mr-1 -ml-2">{@html plus}</div>
          </Button>
        </div>
      </div>
    {:else}
      <Msg message={$translate('app.errors.wallet_channel_open_unavailable')} type="info" />
    {/if}
    {#if openError}
      <div in:slide|local={{ duration: 250 }} class="mt-2">
        <ErrorDetail error={openError} />
      </div>
    {/if}
  </div>
</Section>
