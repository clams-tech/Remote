<script lang="ts">
  import type { Utxo } from '$lib/@types/utxos.js'
  import { msatsToSats } from '$lib/conversion.js'
  import { formatDate } from '$lib/dates.js'
  import { translate } from '$lib/i18n/translations.js'
  import Big from 'big.js'

  export let utxo: Utxo

  const padding = Big(utxo.amount.length)
    .times(8)
    .minus(40)
    .plus(Number(utxo.amount[0]) * 4)
</script>

<a
  style="padding: {padding}px;"
  class="flex flex-col items-center justify-center aspect-square rounded-full w-min border-2 hover:bg-neutral-800/80 bg-neutral-900 transition-colors no-underline"
  href={`/utxos/${utxo.id}`}
>
  <div class="flex flex-col w-full justify-center items-center">
    <div
      class:text-utility-success={utxo.status === 'confirmed'}
      class:text-utility-pending={utxo.status === 'immature' || utxo.status === 'unconfirmed'}
      class:text-utility-error={utxo.status === 'spent'}
      class="flex items-center text-xs whitespace-nowrap"
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
      <span class="font-mono mr-1 text-sm">
        {msatsToSats(utxo.amount).toLocaleString()}
      </span>
      <span class="text-xs">{$translate('app.labels.sats').toLowerCase()}</span>
    </div>

    {#if utxo.timestamp}
      {#await formatDate(utxo.timestamp, 'dd/MM/yy') then date}
        <div class="text-xs text-neutral-400 whitespace-nowrap">
          {date}
        </div>
      {/await}
    {/if}
  </div>
</a>
