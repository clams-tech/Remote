<script lang="ts">
  import type { ConnectionDetails } from '$lib/@types/connections.js'
  import bitcoin from '$lib/icons/bitcoin.js'
  import lightning from '$lib/icons/lightning.js'
  import { connections$ } from '$lib/streams.js'

  export let data: ConnectionDetails
  export let selected = false

  $: connection = $connections$.find((connection) => connection.connectionId === data.id)
</script>

<button
  on:click
  class:border-2={selected}
  class:border-neutral-50={selected}
  class="rounded-full flex items-center justify-center px-[2em] bg-neutral-900 hover:bg-neutral-800/70 transition-all relative"
>
  <div class="absolute top-0 right-0 w-full h-full rounded-full overflow-hidden opacity-70">
    <img src="/images/rock1.png" class="h-auto w-full" alt="texture" />
  </div>

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
</button>
