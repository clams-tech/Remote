<script lang="ts">
  import type { Address } from '$lib/@types/addresses.js'
  import type { TransactionStatus } from '$lib/@types/common.js'
  import type { Invoice } from '$lib/@types/invoices.js'
  import type { Transaction, TransactionCategory } from '$lib/@types/transactions.js'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import { db } from '$lib/db.js'
  import { translate } from '$lib/i18n/translations.js'
  import arrow from '$lib/icons/arrow.js'
  import bitcoin from '$lib/icons/bitcoin.js'
  import caret from '$lib/icons/caret.js'
  import lightning from '$lib/icons/lightning.js'
  import { fade } from 'svelte/transition'
  import { deriveOnchainTransactionDetails } from '../utils.js'
  import { truncateValue } from '$lib/utils.js'
  import type { ConnectionDetails } from '$lib/@types/connections.js'

  export let type: 'invoice' | 'address' | 'transaction'
  export let data: Invoice | Address | (Transaction & { receiveAddress?: Address })

  let formatted = false
  let icon: string
  let status: TransactionStatus
  let balanceChange: string | 'any' | undefined
  let abs: '-' | '+' | undefined
  let channel: Transaction['channel']
  let description: string | undefined
  let request: string | undefined
  let category: TransactionCategory
  let from: string
  let to: string

  const formatData = async () => {
    const connection = (await db.connections.get(data.connectionId)) as ConnectionDetails

    if (type === 'invoice') {
      const {
        status: invoiceStatus,
        direction,
        amount: invoiceAmount,
        description: invoiceDescription,
        offer,
        request: invoiceRequest,
        nodeId
      } = data as Invoice

      icon = lightning
      status = invoiceStatus
      abs = direction === 'receive' ? '+' : '-'
      category = direction === 'receive' ? 'receive' : 'send'
      balanceChange = invoiceAmount === 'any' || invoiceAmount === '0' ? undefined : invoiceAmount
      description = invoiceDescription || offer?.description
      request = invoiceRequest
      from = direction === 'receive' ? 'unknown' : connection.label
      to = direction === 'receive' ? connection.label : truncateValue(nodeId, 4)
    } else if (type === 'address') {
      const { amount: addressAmount, message: addressDescription, createdAt } = data as Address
      icon = bitcoin
      status = 'pending'
      abs = '+'
      category = 'receive'
      balanceChange = addressAmount
      description = addressDescription
      from = 'unknown'
      to = connection.label
    } else if (type === 'transaction') {
      const {
        blockheight,
        receiveAddress,
        channel: channelDetails
      } = data as Transaction & {
        receiveAddress?: Address
      }

      icon = bitcoin
      status = typeof blockheight === 'number' ? 'complete' : 'pending'

      if (receiveAddress && receiveAddress.message) {
        description = receiveAddress.message
      }

      channel = channelDetails

      const derived = await deriveOnchainTransactionDetails(data as Transaction)
      balanceChange = derived.balanceChange
      abs = derived.abs
      category = derived.category
      to = derived.to
      from = derived.from
    }

    formatted = true
  }

  formatData()
</script>

{#if formatted}
  <a
    in:fade
    class="flex items-center justify-between rounded py-3 hover:bg-neutral-800/80 bg-neutral-900 transition-colors no-underline px-2"
    href={`/transactions/${data.id}?connection=${data.connectionId}`}
  >
    <div class="flex items-start">
      <div class="w-6 border rounded-full mr-2 flex-shrink-0">{@html icon}</div>
      <div>
        <div class="mr-2 font-semibold">
          {$translate(`app.labels.${category}`)}
        </div>

        <div class="text-xs font-semibold flex items-center mt-1">
          <div class="border-2 px-1 rounded">
            {from.toLowerCase()}
          </div>

          <div class="w-4 mx-1 -rotate-90">{@html arrow}</div>

          <div class="border-2 px-1 rounded">{to.toLowerCase()}</div>
        </div>
      </div>
    </div>

    <div class="flex items-center">
      {#if balanceChange}
        <div>
          <div
            class:text-utility-success={status === 'complete'}
            class:text-utility-pending={status === 'pending'}
            class:text-utility-error={status === 'expired' || status === 'failed'}
            class="flex items-center justify-end text-xs mt-2"
          >
            <div
              class:bg-utility-success={status === 'complete'}
              class:bg-utility-pending={status === 'pending'}
              class:bg-utility-error={status === 'expired' || status === 'failed'}
              class="w-1.5 h-1.5 rounded-full mr-1"
            />
            <div>{$translate(`app.labels.${status}`)}</div>
          </div>

          <!-- <div class="flex justify-end text-xs">{$translate('app.labels.balance_change')}</div> -->

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
        </div>
      {/if}

      <div class="flex items-center h-full ml-1">
        <div class="w-6 flex-shrink-0 -rotate-90">{@html caret}</div>
      </div>
    </div>
  </a>
{/if}
