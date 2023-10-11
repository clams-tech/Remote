<script lang="ts">
  import type { Utxo } from '$lib/@types/utxos.js'
  import { formatDate } from '$lib/dates.js'
  import { translate } from '$lib/i18n/translations.js'

  export let utxo: Utxo

  const padding = utxo.amount.toString().length * 8 - 24

  let formattedDate: string

  $: if (utxo.timestamp) {
    formatDate(utxo.timestamp, 'dd/MM/yy').then(formatted => (formattedDate = formatted))
  }
</script>

<a
  style="padding: {padding}px;"
  class="flex flex-col items-center justify-center aspect-square rounded-full w-min border-2 hover:bg-neutral-800/80 bg-neutral-900 transition-colors no-underline"
  href={`/utxos/${utxo.id}`}
>
  <div class="flex flex-col w-full justify-center items-center">
    <div
      class:text-utility-success={utxo.status === 'confirmed'}
      class:text-utility-pending={utxo.status === 'immature' ||
        utxo.status === 'unconfirmed' ||
        utxo.status === 'spent_unconfirmed'}
      class:text-utility-error={utxo.status === 'spent'}
      class="flex items-center text-xs whitespace-nowrap"
    >
      <div>{$translate(`app.labels.${utxo.status}`)}</div>
    </div>

    <div class="flex items-baseline">
      <span class="font-mono mr-1 text-sm">
        {utxo.amount.toLocaleString()}
      </span>
      <span class="text-xs">{$translate('app.labels.sats').toLowerCase()}</span>
    </div>

    {#if formattedDate}
      <div class="text-xs text-neutral-400 whitespace-nowrap">
        {formattedDate}
      </div>
    {/if}
  </div>
</a>
