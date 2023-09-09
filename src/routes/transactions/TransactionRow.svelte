<script lang="ts">
  import type { Address } from '$lib/@types/addresses.js'
  import type { Network, TransactionStatus } from '$lib/@types/common.js'
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
  import { getNetwork } from '$lib/utils.js'

  import {
    deriveInvoiceSummary,
    deriveTransactionSummary,
    enhanceInputsOutputs,
    type PaymentSummary,
    type TransactionSummary
  } from '$lib/summary.js'
  import { db } from '$lib/db.js'

  export let type: 'invoice' | 'address' | 'transaction'
  export let data: Invoice | Address | (Transaction & { receiveAddress?: Address })

  let dataReady = false
  let icon: string
  let status: TransactionStatus
  let primary: TransactionSummary['primary']
  let secondary: TransactionSummary['secondary']
  let timestamp: TransactionSummary['timestamp']
  let summaryType: TransactionSummary['type']
  let fee: TransactionSummary['fee']
  let amount: PaymentSummary['amount'] | undefined
  let network: Network

  const formatData = async () => {
    if (type === 'invoice') {
      const { status: invoiceStatus, request } = data as Invoice
      status = invoiceStatus
      icon = lightning
      network = getNetwork(request || '')

      try {
        const summary = await deriveInvoiceSummary(data as Invoice)
        primary = summary.primary
        secondary = summary.secondary
        timestamp = summary.timestamp
        summaryType = summary.type
        fee = summary.fee
        amount = (summary as PaymentSummary).amount
      } catch (error) {
        log.error(`Could not derive summary for invoice id: ${data.id}`)
      }
    } else if (type === 'address') {
      const { walletId, createdAt, amount: receiveAmount } = data as Address
      const wallet = await db.wallets.get(walletId)

      icon = bitcoin
      status = 'pending'
      network = getNetwork((data as Address).value)
      summaryType = 'receive'
      primary = wallet?.label
      secondary = undefined
      timestamp = createdAt
      fee = 0
      amount = receiveAmount
    } else if (type === 'transaction') {
      const {
        blockheight,
        timestamp: txTimestamp,
        channel,
        outputs: transactionOutputs
      } = data as Transaction
      const { inputs, outputs } = await enhanceInputsOutputs(data as Transaction)
      network = getNetwork(transactionOutputs[0].address)
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
      fee = summary.fee
      amount = (summary as PaymentSummary).amount
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
    class="flex items-center justify-between py-3 hover:bg-neutral-800/80 transition-colors no-underline px-2 bg-neutral-900 h-[5.5rem]"
    href={`/transactions/${data.id}?wallet=${data.walletId}`}
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
