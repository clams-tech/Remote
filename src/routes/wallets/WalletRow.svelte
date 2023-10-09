<script lang="ts">
  import type { Wallet } from '$lib/@types/wallets.js'
  import caret from '$lib/icons/caret.js'
  import { getWalletBalance } from '$lib/utils.js'
  import { connectionOptions } from '$lib/wallets/index.js'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import { connections$ } from '$lib/streams.js'
  import { BehaviorSubject } from 'rxjs'
  import { translate } from '$lib/i18n/translations.js'

  export let wallet: Wallet

  const walletBalance$ = getWalletBalance(wallet.id)

  const walletTypeIcon = Object.values(connectionOptions)
    .flat()
    .find(c => c.type === wallet.type)?.icon

  $: connection = $connections$.find(({ walletId }) => walletId === wallet.id)
  $: status = connection ? connection.connectionStatus$ : new BehaviorSubject(null)
</script>

<a
  class="flex items-center justify-between py-3 hover:bg-neutral-800/80 transition-colors no-underline px-2 bg-neutral-900 text-sm xs:text-base"
  href={`/wallets/${wallet.id}`}
>
  <div class="">
    <div class="font-semibold">{wallet.label}</div>
    {#if walletTypeIcon}
      <div class="w-20 mt-1">{@html walletTypeIcon}</div>
    {/if}
  </div>

  <div class="flex items-center ml-2">
    <div>
      {#if $walletBalance$}
        <BitcoinAmount sats={$walletBalance$} />
      {/if}

      <div class="flex items-center justify-end">
        <span
          class="transition-colors whitespace-nowrap text-xs leading-none"
          class:text-utility-success={$status === 'connected'}
          class:text-utility-pending={$status === 'connecting' || $status === 'waiting_reconnect'}
          class:text-utility-error={!$status || $status === 'disconnected'}
          >{$translate(`app.labels.${$status || 'disconnected'}`)}</span
        >

        <div
          class="w-2 h-2 ml-1 rounded-full transition-colors"
          class:bg-utility-success={$status === 'connected'}
          class:bg-utility-pending={$status === 'connecting' || $status === 'waiting_reconnect'}
          class:bg-utility-error={!$status || $status === 'disconnected'}
        />
      </div>
    </div>

    <div class="w-6 -rotate-90">{@html caret}</div>
  </div>
</a>
