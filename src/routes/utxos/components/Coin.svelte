<script lang="ts">
  import type { Utxo } from '$lib/@types/utxos.js'
  import { msatsToSats } from '$lib/conversion.js'
  import { formatDate } from '$lib/dates.js'
  import { translate } from '$lib/i18n/translations.js'
  import Big from 'big.js'

  export let utxo: Utxo

  const padding = Math.max(Big(utxo.amount).div(500000000).toNumber(), 16)
  $: bg =
    utxo.status === 'confirmed'
      ? 'bg-utility-success/30'
      : utxo.status === 'spent'
      ? 'bg-neutral-500/30'
      : 'bg-utility-pending/30'
</script>

<a
  style="padding: {padding}px;"
  class="flex flex-col items-center justify-center h-auto aspect-square border rounded-full hover:bg-neutral-800/80 bg-neutral-900 transition-colors no-underline"
  href={`/transactions/${utxo.id}`}
>
  <div
    class:text-utility-success={utxo.status === 'confirmed'}
    class:text-utility-pending={utxo.status === 'immature' || utxo.status === 'unconfirmed'}
    class:text-utility-error={utxo.status === 'spent'}
    class="flex items-center text-xs mt-1"
  >
    <!-- <div
      class:bg-utility-success={utxo.status === 'confirmed'}
      class:bg-utility-pending={utxo.status === 'immature' || utxo.status === 'unconfirmed'}
      class:bg-utility-error={utxo.status === 'spent'}
      class="w-1.5 h-1.5 rounded-full mr-1"
    /> -->
    <div>{$translate(`app.labels.${utxo.status}`)}</div>
  </div>

  <div class="flex items-baseline">
    <span class="font-mono mr-1">
      {msatsToSats(utxo.amount).toLocaleString()}
    </span>
    <span class="text-xs">{$translate('app.labels.sats').toLowerCase()}</span>
  </div>

  {#if utxo.timestamp}
    {#await formatDate(utxo.timestamp, 'do MMM, yyyy') then date}
      <div class="text-xs text-neutral-400">
        {date}
      </div>
    {/await}
  {/if}
</a>
