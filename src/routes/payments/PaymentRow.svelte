<script lang="ts">
  import type { Payment } from '$lib/@types/common.js'
  import bitcoin from '$lib/icons/bitcoin.js'
  import lightning from '$lib/icons/lightning.js'
  import { translate } from '$lib/i18n/translations.js'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import caret from '$lib/icons/caret.js'
  import Summary from './Summary.svelte'
  import type { PaymentSummary } from '$lib/summary.js'
  import { updateCounterPartyNodeInfo } from './utils.js'

  export let payment: Payment
  export let summary: PaymentSummary
  export let formattedTimestamp: string

  const { type, network, amount, id, walletId, status } = payment
  const icon = type === 'invoice' ? lightning : bitcoin
  let { primary, secondary, type: summaryType } = summary

  updateCounterPartyNodeInfo(summary.secondary).then(node => {
    if (node) {
      summary.secondary = { type: 'node', value: node }
    }
  })
</script>

<a
  class="flex items-center justify-between py-3 hover:bg-neutral-800/80 transition-colors no-underline px-2 bg-neutral-900 h-[5.5rem]"
  href={`/payments/${id}?wallet=${walletId}`}
>
  <div class="flex items-start h-full">
    <div
      class="w-6 border border-current rounded-full mr-2 flex-shrink-0"
      class:text-bitcoin-orange={type === 'transaction' || type === 'address'}
      class:text-bitcoin-yellow={type === 'invoice'}
    >
      {@html icon}
    </div>

    <Summary
      {primary}
      {secondary}
      {status}
      type={summaryType}
      timestamp={formattedTimestamp}
      {network}
      displayNetwork
    />
  </div>

  <div class="flex items-center ml-4">
    <div>
      {#if amount && status !== 'expired'}
        <div class="w-full flex justify-end text-xs">
          {$translate(`app.labels.summary_amount_${summaryType}`, { status })}:
        </div>
        <BitcoinAmount sats={amount} />
      {/if}

      <div
        class:text-utility-success={status === 'complete'}
        class:text-utility-pending={status === 'pending'}
        class:text-utility-error={status === 'expired' || status === 'failed'}
        class="flex items-center justify-end text-xs"
      >
        <div
          class:bg-utility-success={status === 'complete'}
          class:bg-utility-pending={status === 'pending'}
          class:bg-utility-error={status === 'expired' || status === 'failed'}
          class="w-1.5 h-1.5 rounded-full mr-1"
        />
        <div>{$translate(`app.labels.${status}`)}</div>
      </div>
    </div>

    <div class="w-6 -rotate-90">{@html caret}</div>
  </div>
</a>
