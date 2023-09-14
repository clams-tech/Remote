<script lang="ts">
  import type { Payment } from '$lib/@types/common.js'
  import type { Invoice } from '$lib/@types/invoices.js'
  import type { Transaction } from '$lib/@types/transactions.js'
  import bitcoin from '$lib/icons/bitcoin.js'
  import lightning from '$lib/icons/lightning.js'
  import { fade } from 'svelte/transition'
  import { translate } from '$lib/i18n/translations.js'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import caret from '$lib/icons/caret.js'
  import { log } from '$lib/services.js'
  import Summary from './Summary.svelte'
  import { db } from '$lib/db.js'

  import {
    deriveInvoiceSummary,
    derivePaymentSummary,
    enhanceInputsOutputs,
    type PaymentSummary
  } from '$lib/summary.js'

  export let payment: Payment

  let { type, network, timestamp, amount, fee, id, walletId, status } = payment
  let dataReady = false
  let icon: string
  let primary: PaymentSummary['primary']
  let secondary: PaymentSummary['secondary']
  let summaryType: PaymentSummary['type']

  const formatData = async () => {
    if (type === 'invoice') {
      icon = lightning
      const invoice = (await db.invoices.get(id)) as Invoice

      try {
        const summary = await deriveInvoiceSummary(invoice)
        primary = summary.primary
        secondary = summary.secondary
        summaryType = summary.type
      } catch (error) {
        log.error(`Could not derive summary for invoice id: ${id}`)
      }
    } else if (type === 'address') {
      const wallet = await db.wallets.get(walletId)

      icon = bitcoin
      summaryType = 'receive'
      primary = wallet?.label
      secondary = undefined
    } else if (type === 'transaction') {
      const transaction = (await db.transactions.where({ id, walletId }).first()) as Transaction
      const { inputs, outputs } = await enhanceInputsOutputs(transaction)
      icon = bitcoin

      const summary = await derivePaymentSummary({
        inputs,
        outputs,
        fee,
        timestamp,
        channel: transaction.channel
      })

      primary = summary.primary
      secondary = summary.secondary
      summaryType = summary.type
      fee = summary.fee
      amount = summary.amount
    }

    dataReady = true
  }

  $: if (payment) {
    formatData()
  }
</script>

{#if dataReady}
  <a
    in:fade
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

      <Summary {primary} {secondary} {status} type={summaryType} {timestamp} {network} />
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
{/if}
