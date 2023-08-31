<script lang="ts">
  import type { Address } from '$lib/@types/addresses.js'
  import type { TransactionStatus } from '$lib/@types/common.js'
  import type { Invoice } from '$lib/@types/invoices.js'
  import type { Transaction } from '$lib/@types/transactions.js'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import { db } from '$lib/db.js'
  import { translate } from '$lib/i18n/translations.js'
  import arrow from '$lib/icons/arrow.js'
  import bitcoin from '$lib/icons/bitcoin.js'
  import caret from '$lib/icons/caret.js'
  import lightning from '$lib/icons/lightning.js'
  import { fade } from 'svelte/transition'
  import type { Wallet } from '$lib/@types/wallets.js'
  import { truncateValue } from '$lib/utils.js'
  import { connections$ } from '$lib/streams.js'
  import {
    deriveInvoiceSummary,
    deriveReceiveAddressSummary,
    deriveTransactionSummary,
    enhanceInputsOutputs,
    type TransactionSummary
  } from '$lib/summary.js'
  import type { Connection } from '$lib/wallets/interfaces.js'

  export let type: 'invoice' | 'address' | 'transaction'
  export let data: Invoice | Address | (Transaction & { receiveAddress?: Address })

  let icon: string
  let status: TransactionStatus
  let summary: TransactionSummary

  $: connection = $connections$.find(({ walletId }) => walletId === data.walletId)

  const formatData = async () => {
    if (type === 'invoice') {
      const { status: invoiceStatus } = data as Invoice
      status = invoiceStatus
      icon = lightning
      summary = await deriveInvoiceSummary(data as Invoice)
    } else if (type === 'address') {
      icon = bitcoin
      status = 'pending'
      summary = await deriveReceiveAddressSummary(data as Address)
    } else if (type === 'transaction') {
      const { blockheight, timestamp, fee } = data as Transaction
      const { inputs, outputs } = await enhanceInputsOutputs(data as Transaction)
      icon = bitcoin
      status = blockheight ? 'complete' : 'pending'
      summary = await deriveTransactionSummary({ inputs, outputs, timestamp, fee })
    }
  }

  formatData()
</script>

{#if summary}
  <a
    in:fade
    class="flex items-center justify-between py-3 hover:bg-neutral-800/80 transition-colors no-underline px-2 bg-neutral-900"
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
    </div>
  </a>
{/if}
