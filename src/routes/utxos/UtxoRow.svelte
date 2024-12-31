<script lang="ts">
  import { base } from '$app/paths'
  import type { Utxo } from '$lib/@types/utxos.js'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import { formatDate } from '$lib/dates.js'
  import { translate } from '$lib/i18n/translations.js'
  import caret from '$lib/icons/caret.js'
  import { wallets$ } from '$lib/streams.js'

  export let utxo: Utxo
  const { amount, status, id } = utxo

  let formattedDate: string
  $: wallet = $wallets$.find(({ id }) => id === utxo.walletId)

  $: if (utxo.timestamp) {
    formatDate(utxo.timestamp, 'do MMM hh:mma').then(formatted => (formattedDate = formatted))
  }
</script>

<a
  href={`${base}/utxos/${id}`}
  class="w-full flex items-center justify-between no-underline hover:bg-neutral-800/80 bg-neutral-900 transition-all px-2 py-4 rounded"
>
  <div>
    {#if wallet}
      <div class="font-semibold text-purple-100 bg-neutral-800 rounded-full px-2 w-min text-sm">
        {wallet.label}
      </div>
    {/if}

    {#if formattedDate}
      <div class="text-xs font-semibold mt-1 ml-2">{formattedDate}</div>
    {/if}
  </div>

  <div class="flex items-center ml-4 h-full">
    <div>
      <div
        class:text-utility-success={status === 'confirmed'}
        class:text-utility-error={status === 'spent'}
        class:text-utility-pending={status === 'spent_unconfirmed' ||
          status === 'unconfirmed' ||
          status === 'immature'}
        class="flex items-center justify-end text-xs"
      >
        <div
          class:bg-utility-success={status === 'confirmed'}
          class:bg-utility-error={status === 'spent'}
          class:bg-utility-pending={status === 'spent_unconfirmed' ||
            status === 'unconfirmed' ||
            status === 'immature'}
          class="w-1.5 h-1.5 rounded-full mr-1"
        />
        <div>{$translate(`app.labels.${status}`)}</div>
      </div>

      <BitcoinAmount sats={amount} />
    </div>

    <div class="w-6 -rotate-90 -mr-1 ml-1">{@html caret}</div>
  </div>
</a>
