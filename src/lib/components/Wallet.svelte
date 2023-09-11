<script lang="ts">
  import type { Wallet } from '$lib/@types/wallets.js'
  import { translate } from '$lib/i18n/translations.js'
  import { connections$ } from '$lib/streams.js'
  import { of } from 'rxjs'

  export let data: Wallet
  export let selected = false

  $: connection = $connections$.find((connection) => connection.walletId === data.id)
  $: status = connection?.connectionStatus$ || of('disconnected')
</script>

<button
  on:click
  class:border-purple-300={selected}
  class="rounded-xl border-2 border-neutral-50 px-[0.75em] py-[0.5em] bg-neutral-900 hover:bg-neutral-800/70 transition-all relative"
>
  <div class="relative">
    <div class="font-semibold truncate w-full text-center leading-none">
      {data.label}
    </div>
  </div>

  <div class="flex items-center mt-0.5">
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
</button>
