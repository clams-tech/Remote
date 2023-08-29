<script lang="ts">
  import type { Wallet } from '$lib/@types/wallets.js'
  import bitcoin from '$lib/icons/bitcoin.js'
  import lightning from '$lib/icons/lightning.js'
  import { connections$ } from '$lib/streams.js'

  export let data: Wallet
  export let selected = true

  $: connection = $connections$.find((connection) => connection.walletId === data.id)
  $: status = connection?.connectionStatus$
</script>

<button
  on:click
  class:border-purple-300={selected}
  class="rounded-xl border-2 border-neutral-50 flex items-center justify-center px-[1em] bg-neutral-900 hover:bg-neutral-800/70 transition-all relative"
>
  <div class="flex items-center relative">
    {#if connection}
      <div class="flex items-center mr-1">
        {#if connection.transactions}
          <div class="w-5 -ml-2 -mr-1 text-bitcoin-orange">{@html bitcoin}</div>
        {/if}

        {#if connection.invoices}
          <div class="w-5 text-bitcoin-yellow">{@html lightning}</div>
        {/if}
      </div>
    {/if}

    <div class="font-semibold truncate w-full text-center py-[0.75em] leading-none">
      {data.label}
    </div>
  </div>

  {#if status}
    <div
      class="w-2.5 h-2.5 ml-2 rounded-full transition-colors"
      class:bg-utility-success={$status === 'connected'}
      class:bg-utility-pending={$status === 'connecting' || $status === 'waiting_reconnect'}
      class:bg-utility-error={!$status || $status === 'disconnected'}
    />
  {/if}
</button>
