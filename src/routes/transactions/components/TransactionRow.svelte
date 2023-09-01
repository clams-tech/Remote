<script lang="ts">
  import type { Address } from '$lib/@types/addresses.js'
  import type { TransactionStatus } from '$lib/@types/common.js'
  import type { Invoice } from '$lib/@types/invoices.js'
  import type { Transaction } from '$lib/@types/transactions.js'
  import bitcoin from '$lib/icons/bitcoin.js'
  import lightning from '$lib/icons/lightning.js'
  import { fade } from 'svelte/transition'
  import { translate } from '$lib/i18n/translations.js'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import caret from '$lib/icons/caret.js'
  import { formatDate } from '$lib/dates.js'
  import { truncateValue } from '$lib/utils.js'

  import {
    deriveInvoiceSummary,
    deriveReceiveAddressSummary,
    deriveTransactionSummary,
    enhanceInputsOutputs,
    type PaymentSummary,
    type TransactionSummary
  } from '$lib/summary.js'

  export let type: 'invoice' | 'address' | 'transaction'
  export let data: Invoice | Address | (Transaction & { receiveAddress?: Address })

  let dataReady = false
  let icon: string
  let status: TransactionStatus
  let primary: TransactionSummary['primary']
  let secondary: TransactionSummary['secondary']
  let timestamp: TransactionSummary['timestamp']
  let summaryType: TransactionSummary['type']
  let category: TransactionSummary['category']
  let fee: TransactionSummary['fee']
  let amount: PaymentSummary['amount'] | undefined

  const formatData = async () => {
    if (type === 'invoice') {
      const { status: invoiceStatus } = data as Invoice
      status = invoiceStatus
      icon = lightning
      const summary = await deriveInvoiceSummary(data as Invoice)
      primary = summary.primary
      secondary = summary.secondary
      timestamp = summary.timestamp
      summaryType = summary.type
      category = summary.category
      fee = summary.fee
      amount = (summary as PaymentSummary).amount
    } else if (type === 'address') {
      icon = bitcoin
      status = 'pending'
      const summary = await deriveReceiveAddressSummary(data as Address)
      primary = summary.primary
      secondary = summary.secondary
      timestamp = summary.timestamp
      summaryType = summary.type
      category = summary.category
      fee = summary.fee
      amount = (summary as PaymentSummary).amount
    } else if (type === 'transaction') {
      const { blockheight, timestamp: txTimestamp, channel } = data as Transaction
      const { inputs, outputs } = await enhanceInputsOutputs(data as Transaction)
      icon = bitcoin
      status = blockheight ? 'complete' : 'pending'

      const summary = await deriveTransactionSummary({
        inputs,
        outputs,
        fee,
        timestamp: txTimestamp,
        channel
      })

      primary = summary.primary
      secondary = summary.secondary
      timestamp = summary.timestamp
      summaryType = summary.type
      category = summary.category
      fee = summary.fee
      amount = (summary as PaymentSummary).amount
      console.log({ summaryType })
    }
    dataReady = true
  }

  $: if (data) {
    formatData()
  }
</script>

{#if dataReady}
  <a
    in:fade
    class="flex items-start justify-between py-3 hover:bg-neutral-800/80 transition-colors no-underline px-2 bg-neutral-900 h-[5.5rem]"
    href={`/transactions/${data.id}?wallet=${data.walletId}`}
  >
    <div class="flex items-start">
      <div
        class="w-6 border border-current rounded-full mr-2 flex-shrink-0"
        class:text-bitcoin-orange={type === 'transaction' || type === 'address'}
        class:text-bitcoin-yellow={type === 'invoice'}
      >
        {@html icon}
      </div>

      <div>
        <div class="">
          <span class="font-semibold text-purple-100">
            {primary ? truncateValue(primary, 12) : $translate('app.labels.unknown')}
          </span>
          <span class="italic">
            {$translate(`app.labels.summary_${summaryType}`)}
          </span>

          <span class="font-semibold text-purple-100">
            {secondary ? truncateValue(secondary, 12) : $translate('app.labels.unknown')}
          </span>
        </div>

        {#await formatDate(timestamp, 'hh:mma') then formattedTime}
          <div class="text-xs font-semibold mt-1">{formattedTime}</div>
        {/await}
      </div>
    </div>

    <div class="flex items-center ml-10">
      {#if amount}
        <BitcoinAmount sats={amount} />
      {/if}
      <div class="w-6 -rotate-90">{@html caret}</div>
    </div>
  </a>
{/if}
