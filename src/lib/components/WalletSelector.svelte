<script lang="ts">
  import type { Wallet } from '$lib/@types/wallets.js'
  import { STORAGE_KEYS } from '$lib/constants.js'
  import { log, storage } from '$lib/services.js'
  import Msg from './Msg.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import WalletComponent from './Wallet.svelte'
  import { wallets$ } from '$lib/streams.js'

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

  if (autoSelectLast) {
    try {
      const lastUsedWalletId = storage.get(
        autoSelectLast === 'received' ? STORAGE_KEYS.lastReceiveWallet : STORAGE_KEYS.lastSendWallet
      )

      if (lastUsedWalletId && wallets.find(({ id }) => id === lastUsedWalletId)) {
        selectedWalletId = lastUsedWalletId
      }
    } catch (error) {
      log.warn('Access to storage denied when trying to retrieve last received wallet id')
    }
  } else {
    selectWallet(wallets[0].id)
  }
</script>

{#if $wallets$}
  <div class="w-full">
    {#if !$wallets$.length}
      <div class="mt-4">
        <Msg closable={false} message={$translate('app.labels.add_wallet')} type="info" />
      </div>
    {:else}
      {#if label}
        <div class="mb-2 text-neutral-300 font-semibold text-sm">
          {label}
        </div>
      {/if}

      <div class="flex w-full flex-wrap gap-2 p-4 border border-neutral-600 rounded bg-neutral-900">
        {#each $wallets$ as wallet}
          <WalletComponent
            selected={selectedWalletId === wallet.id}
            on:click={() => selectWallet(wallet.id)}
            data={wallet}
          />
        {/each}
      </div>
    {/if}
  </div>
{/if}
