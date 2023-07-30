<script lang="ts">
  import type { Address } from '$lib/@types/addresses.js'
  import type { Invoice, PaymentStatus } from '$lib/@types/invoices.js'
  import type { Transaction } from '$lib/@types/transactions.js'
  import BitcoinAmount from '$lib/elements/BitcoinAmount.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import bitcoin from '$lib/icons/bitcoin.js'
  import caret from '$lib/icons/caret.js'
  import lightning from '$lib/icons/lightning.js'

  export let type: 'invoice' | 'address' | 'transaction'
  export let data: Invoice | Address | (Transaction & { receiveAddress?: Address })

  let icon: string
  let status: PaymentStatus
  let balanceChange: string | 'any' | undefined
  let abs: '-' | '+' | undefined
  let channelClose = false
  let channelOpen = false
  let description: string | undefined

  if (type === 'invoice') {
    const {
      status: invoiceStatus,
      direction,
      amount: invoiceAmount,
      description: invoiceDescription,
      offer
    } = data as Invoice

    icon = lightning
    status = invoiceStatus
    abs = direction == 'receive' ? '+' : '-'
    balanceChange = invoiceAmount
    description = invoiceDescription || offer?.description
  } else if (type === 'address') {
    const { amount: addressAmount, description: addressDescription, createdAt } = data as Address
    icon = bitcoin
    status = 'pending'
    abs = '+'
    balanceChange = addressAmount
    description = addressDescription
  } else if (type === 'transaction') {
    const { events, blockheight, receiveAddress } = data as Transaction & {
      receiveAddress?: Address
    }

    icon = bitcoin
    status = typeof blockheight === 'number' ? 'complete' : 'pending'

    if (receiveAddress && receiveAddress.description) {
      description = receiveAddress.description
    }

    const channelEvent = events.find(({ type }) => type.includes('channel'))
    channelOpen = channelEvent?.type === 'channelOpen'
    channelClose = channelEvent?.type === 'channelClose'

    if (!!channelEvent) {
      const fee = events.find(({ type }) => type === 'fee')

      if (fee && fee.amount && fee.amount !== '0') {
        balanceChange = fee.amount
        abs = '-'
      }
    } else {
      events.forEach((event) => {
        if (event.type === 'deposit') {
          abs = '+'
          balanceChange = event.amount
        } else if (event.type === 'withdrawal') {
          abs = '-'
          balanceChange = event.amount
        }
      })
    }
  }

  const mainText =
    description ||
    $translate(
      `app.labels.${
        channelOpen
          ? 'channel_open'
          : channelClose
          ? 'channel_close'
          : type === 'address'
          ? 'receive_address'
          : type === 'transaction'
          ? abs === '+'
            ? 'onchain_receive'
            : 'onchain_send'
          : 'invoice'
      }`
    )
</script>

<a
  class="flex items-center justify-between py-3 hover:bg-neutral-800/80 bg-neutral-900 transition-colors no-underline p-2"
  href={`/transactions/${data.id}`}
>
  <div class="flex items-start">
    <div class="w-6 border rounded-full mr-2">{@html icon}</div>
    <div>
      <div class="">
        {mainText}
      </div>

      <div
        class:text-utility-success={status === 'complete'}
        class:text-utility-pending={status === 'pending'}
        class:text-utility-error={status === 'expired'}
        class="flex items-center text-xs"
      >
        <div class="w-1.5 h-1.5 rounded-full bg-current mr-1" />
        <div>{$translate(`app.labels.${status}`)}</div>
      </div>
    </div>
  </div>

  <button class="flex items-center">
    {#if balanceChange}
      <div class="flex items-center">
        <div
          class="mb-0.5 font-semibold text-lg font-mono"
          class:text-utility-success={abs === '+'}
          class:text-utility-error={abs === '-'}
        >
          {abs}
        </div>
        <BitcoinAmount msat={balanceChange} />
      </div>
    {/if}

    <div class="flex items-center h-full ml-1">
      <div class="w-4 -rotate-90">{@html caret}</div>
    </div>
  </button>
</a>
