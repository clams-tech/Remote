<script lang="ts">
  import type { Address } from '$lib/@types/addresses.js'
  import type { TransactionStatus } from '$lib/@types/common.js'
  import type { Invoice } from '$lib/@types/invoices.js'
  import type { Transaction } from '$lib/@types/transactions.js'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import bitcoin from '$lib/icons/bitcoin.js'
  import caret from '$lib/icons/caret.js'
  import lightning from '$lib/icons/lightning.js'
  import { calculateTransactionBalanceChange } from '../utils.js'

  export let type: 'invoice' | 'address' | 'transaction'
  export let data: Invoice | Address | (Transaction & { receiveAddress?: Address })

  let icon: string
  let status: TransactionStatus
  let balanceChange: string | 'any' | undefined
  let abs: '-' | '+' | undefined
  let channelClose = false
  let channelOpen = false
  let description: string | undefined
  let request: string | undefined

  const formatInvoice = () => {
    const {
      status: invoiceStatus,
      direction,
      amount: invoiceAmount,
      description: invoiceDescription,
      offer,
      request: invoiceRequest
    } = data as Invoice

    icon = lightning
    status = invoiceStatus
    abs = direction == 'receive' ? '+' : '-'
    balanceChange = invoiceAmount === 'any' || invoiceAmount === '0' ? undefined : invoiceAmount
    description = invoiceDescription || offer?.description
    request = invoiceRequest
  }

  const formatAddress = () => {
    const { amount: addressAmount, message: addressDescription, createdAt } = data as Address
    icon = bitcoin
    status = 'pending'
    abs = '+'
    balanceChange = addressAmount
    description = addressDescription
  }

  const formatTransaction = async () => {
    const { events, blockheight, receiveAddress, inputs, outputs } = data as Transaction & {
      receiveAddress?: Address
    }

    icon = bitcoin
    status = typeof blockheight === 'number' ? 'complete' : 'pending'

    if (receiveAddress && receiveAddress.message) {
      description = receiveAddress.message
    }

    const channelEvent = events.find(({ type }) => type.includes('channel'))
    channelOpen = channelEvent?.type === 'channelOpen'
    channelClose = channelEvent?.type === 'channelClose'

    const calculated = await calculateTransactionBalanceChange(data as Transaction)
    balanceChange = calculated.balanceChange
    abs = calculated.abs
  }

  $: if (type === 'invoice') {
    formatInvoice()
  } else if (type === 'address') {
    formatAddress()
  } else if (type === 'transaction') {
    formatTransaction()
  }

  $: mainText =
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
          : type === 'invoice' && !request
          ? 'keysend'
          : 'invoice'
      }`
    )
</script>

<a
  class="flex items-center justify-between rounded py-3 hover:bg-neutral-800/80 bg-neutral-900 transition-colors no-underline px-2"
  href={`/transactions/${data.id}`}
>
  <div class="flex items-start">
    <div class="w-6 border rounded-full mr-2 flex-shrink-0">{@html icon}</div>
    <div>
      <div class="mr-2 leading-none">
        {mainText}
      </div>

      <div
        class:text-utility-success={status === 'complete'}
        class:text-utility-pending={status === 'pending'}
        class:text-utility-error={status === 'expired' || status === 'failed'}
        class="flex items-center text-xs mt-1"
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
  </div>

  <div class="flex items-center">
    {#if balanceChange}
      <div class="flex items-center">
        <div
          class="mr-1 font-semibold text-lg font-mono"
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
  </div>
</a>
