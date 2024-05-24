<script lang="ts">
  import type { Wallet } from '$lib/@types/wallets.js'
  import { STORAGE_KEYS } from '$lib/constants.js'
  import { log, storage } from '$lib/services.js'
  import Msg from './Msg.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import WalletComponent from './Wallet.svelte'
  import Spinner from './Spinner.svelte'
  import { createWallet } from '$lib/wallets'
  import { goto } from '$app/navigation'

  export let autoSelectLast: 'sent' | 'received' | '' = ''
  export let label: string = $translate('app.labels.wallet')
  export let selectedWalletId: Wallet['id']
  export let wallets: Wallet[]

  const selectWallet = (id: Wallet['id']) => {
    selectedWalletId = id

    if (autoSelectLast) {
      try {
        storage.write(
          autoSelectLast === 'received'
            ? STORAGE_KEYS.lastReceiveWallet
            : STORAGE_KEYS.lastSendWallet,
          id
        )
      } catch (error) {
        log.warn('Access to storage denied when trying to write last received wallet id')
      }
    }
  }

  $: if (wallets?.length && !selectedWalletId) {
    if (autoSelectLast) {
      try {
        const lastUsedWalletId = storage.get(
          autoSelectLast === 'received'
            ? STORAGE_KEYS.lastReceiveWallet
            : STORAGE_KEYS.lastSendWallet
        )

        if (lastUsedWalletId && wallets.find(({ id }) => id === lastUsedWalletId)) {
          selectedWalletId = lastUsedWalletId
        } else {
          selectWallet(wallets[0].id)
        }
      } catch (error) {
        selectWallet(wallets[0].id)
        log.warn('Access to storage denied when trying to retrieve last received wallet id')
      }
    } else {
      selectWallet(wallets[0].id)
    }
  }
</script>

<div class="w-full">
  {#if !wallets}
    <Spinner />
  {:else if !wallets.length}
    <div class="mt-4">
      <Msg closable={false} message={$translate('app.labels.add_wallet')} type="info"
        ><button
          class="mx-1 underline"
          on:click={async () => {
            const { id } = await createWallet()
            goto(`/wallets/${id}`)
          }}>{$translate('app.labels.create_new_wallet_connection')}</button
        >
        {$translate('app.labels.to_get_started').toLowerCase()}.</Msg
      >
    </div>
  {:else}
    {#if label}
      <div class="mb-2 text-neutral-300 font-semibold text-sm">
        {label}
      </div>
    {/if}

    <div class="flex w-full flex-wrap gap-2 p-4 border border-neutral-600 rounded bg-neutral-900">
      {#each wallets as wallet}
        <WalletComponent
          selected={selectedWalletId === wallet.id}
          on:click={() => selectWallet(wallet.id)}
          data={wallet}
        />
      {/each}
    </div>
  {/if}
</div>
