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
  import { fetchTransactions, fetchUtxos } from '$lib/wallets/index.js'
  import Big from 'big.js'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'

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
  let spendAll: boolean
  let announce = true

  let validAddress: boolean
  let opening = false
  let openError: AppError | null

  if (data.address) {
    address = data.address
  }

  $: validAddress = validateNodeAddress(address)

  let totalSpendableUtxos: number

  const loadTotalSpendableUtxos = async () => {
    const utxos = await db.utxos.where({ walletId: selectedWalletId }).toArray()

    totalSpendableUtxos = utxos
      .reduce(
        (total, { status, amount }) =>
          status === 'confirmed' || status === 'unconfirmed' ? total.plus(amount) : total,
        Big(0)
      )
      .toNumber()
  }

  $: if (selectedWalletId) {
    loadTotalSpendableUtxos()
  }

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
        amount: spendAll ? 'all' : channelSize,
        announce
      })

      const [channel] = await connection.channels!.get({
        id: openChannelResult.id,
        peerId: publicKey
      })

      await db.channels.add(channel)

      // update transactions
      if (connection.transactions?.get) {
        fetchTransactions(connection)
      }

      // update utxos
      if (connection.utxos?.get) {
        fetchUtxos(connection)
      }

      await goto(`/channels/${channel.id}`)
    } catch (error) {
      openError = error as AppError
    } finally {
      opening = false
    }
  }
</script>

<svelte:head>
  <title>{$translate(`app.routes./channels/open.title`)}</title>
</svelte:head>

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

      <div>
        <div class="text-sm w-1/2 text-inherit text-neutral-300 mb-2 font-semibold">
          {$translate('app.labels.spendable')}
        </div>

        <BitcoinAmount sats={totalSpendableUtxos || 0} />
      </div>

      {#if spendAll}
        <TextInput
          name="amount"
          type="text"
          readonly
          label={$translate('app.labels.channel_size')}
          value={$translate('app.labels.spend_all')}
        />
      {:else}
        <TextInput
          name="amount"
          type="number"
          label={$translate('app.labels.channel_size')}
          sats={channelSize}
          bind:value={channelSize}
        />
      {/if}

      <div class="text-sm font-semibold text-neutral-300">
        <Toggle bind:toggled={spendAll}>
          <div slot="left" class="mr-2">{$translate('app.labels.spend_all')}</div>
        </Toggle>
      </div>

      <div class="text-sm font-semibold text-neutral-300">
        <Toggle bind:toggled={announce}>
          <div slot="left" class="mr-2">{$translate('app.labels.announce_channel')}</div>
        </Toggle>
      </div>

      <div class="mt-2 w-full flex justify-end">
        <div class="w-min">
          <Button
            disabled={!address || !validAddress || (!channelSize && !spendAll)}
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
