<script lang="ts">
  import type { Address } from '$lib/@types/addresses.js'
  import type { Invoice, PaymentStatus } from '$lib/@types/invoices.js'
  import type { Transaction } from '$lib/@types/transactions.js'
  import { formatDate } from '$lib/dates.js'
  import { translate } from '$lib/i18n/translations.js'
  import bitcoin from '$lib/icons/bitcoin.js'
  import clock from '$lib/icons/clock.js'
  import close from '$lib/icons/close.js'
  import lightning from '$lib/icons/lightning.js'
  import { fade } from 'svelte/transition'

  export let type: 'invoice' | 'address' | 'transaction'
  export let data: Invoice | Address | (Transaction & { receiveAddress?: Address })

  let status: PaymentStatus
  let direction: 'send' | 'receive'
  let timestamp: number
  let amount: string | 'any'
  let description: string | undefined
  let channelClose = false
  let channelOpen = false

  if (type === 'invoice') {
    const {
      status: invoiceStatus,
      direction: invoiceDirection,
      createdAt,
      completedAt,
      amount: invoiceAmount,
      description: invoiceDescription
    } = data as Invoice

    status = invoiceStatus
    direction = invoiceDirection
    amount = invoiceAmount
    timestamp = completedAt || createdAt
    description = invoiceDescription
  } else if (type === 'address') {
    const { amount: addressAmount, description: addressDescription, createdAt } = data as Address

    status = 'pending'
    direction = 'receive'
    timestamp = createdAt
    amount = addressAmount
    description = addressDescription
  } else if (type === 'transaction') {
    const { events, blockheight } = data as Transaction

    status = blockheight ? 'complete' : 'pending'

    events.forEach((event) => {
      if (event.type === 'deposit') {
        direction = 'receive'
        timestamp = event.timestamp
        amount = event.amount
      } else if (event.type === 'withdrawal') {
        direction = 'send'
        timestamp = event.timestamp
        amount = event.amount
      } else if (event.type === 'channelClose') {
        channelClose = true
      } else if (event.type === 'channelOpen') {
        channelOpen = true
      }
    })
  }
</script>

<a
  class="flex items-center justify-between py-3 border-t hover:bg-neutral-800/40 transition-colors no-underline"
  href={`/payments/${data.id}`}
>
  <div class="flex items-start w-3/5">
    <div
      class="border rounded-full w-6 flex items-center justify-center mr-2 {direction ===
        'receive' && status === 'complete'
        ? 'border-utility-success text-utility-success'
        : status === 'pending'
        ? 'border-utility-pending text-utility-pending'
        : status === 'expired' || status === 'failed'
        ? 'border-utility-error text-utility-error'
        : 'border-current'} font-bold flex-shrink-0"
    >
      {#if status === 'complete'}
        {#if type === 'invoice'}
          {@html lightning}
        {:else}
          {@html bitcoin}
        {/if}
      {:else if status === 'pending'}
        {@html clock}
      {:else}
        {@html close}
      {/if}
    </div>
    <div class="flex flex-col w-full">
      <span class="font-bold">{$translate('app.payment.status', { direction, status })}</span>

      {#if description}
        <span class="text-sm italic text-neutral-500 break-words">{description}</span>
      {/if}

      {#if timestamp}
        <span class="text-sm text-neutral-400 mt-1">
          {#await formatDate(timestamp) then formatted}
            <span in:fade={{ duration: 50 }}>{formatted}</span>
          {/await}
        </span>
      {/if}
    </div>
  </div>
</a>
