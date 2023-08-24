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
  import type { ConnectionDetails } from '$lib/@types/connections.js'
  import { truncateValue } from '$lib/utils.js'
  import type { Metadata } from '$lib/@types/metadata.js'
  import { connections$ } from '$lib/streams.js'

  export let type: 'invoice' | 'address' | 'transaction'
  export let data: Invoice | Address | (Transaction & { receiveAddress?: Address })

  let formatted = false
  let icon: string
  let status: TransactionStatus
  let balanceChange: string | 'any' | undefined
  let channelEvent: Transaction['channel']
  let description: string | undefined
  let request: string | undefined
  let tags: Metadata['tags']
  let counterparties: Metadata['counterparties']
  let action: string
  let connection: ConnectionDetails

  const formatData = async () => {
    connection = (await db.connections.get(data.connectionId)) as ConnectionDetails

    if (type === 'invoice') {
      const {
        status: invoiceStatus,
        description: invoiceDescription,
        offer,
        request: invoiceRequest,
        id
      } = data as Invoice

      icon = lightning
      status = invoiceStatus

      const metadata = await db.metadata.get(id)

      if (metadata) {
        tags = metadata.tags
        balanceChange = metadata.balanceChange
        counterparties = metadata.counterparties
      }

      description = invoiceDescription || offer?.description
      request = invoiceRequest
    } else if (type === 'address') {
      const { amount: addressAmount, message: addressDescription, createdAt } = data as Address
      icon = bitcoin
      status = 'pending'
      tags = ['income']
      balanceChange = addressAmount
      description = addressDescription
    } else if (type === 'transaction') {
      const { id, blockheight, receiveAddress, channel } = data as Transaction & {
        receiveAddress?: Address
      }

      icon = bitcoin
      status = typeof blockheight === 'number' ? 'complete' : 'pending'

      if (receiveAddress && receiveAddress.message) {
        description = receiveAddress.message
      }

      channelEvent = channel

      const metadata = await db.metadata.get(id)

      if (metadata) {
        balanceChange = metadata.balanceChange
        tags = metadata.tags
        counterparties = metadata.counterparties
      }
    }

    action = tags.includes('income')
      ? 'receive'
      : tags.includes('expense')
      ? 'send'
      : tags.includes('transfer')
      ? 'transfer'
      : channelEvent
      ? channelEvent.type === 'open'
        ? 'channel_open'
        : 'channel_close'
      : ''

    formatted = true
  }

  formatData()
</script>

{#if formatted}
  <a
    in:fade
    class="flex items-center justify-between py-3 hover:bg-neutral-800/80 bg-neutral-900 transition-colors no-underline px-2"
    href={`/transactions/${data.id}?connection=${data.connectionId}`}
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
        <div class="mr-2 font-semibold">
          {$translate(`app.labels.${action}`)}
        </div>

        <div class="text-xs font-semibold flex items-center mt-1 uppercase">
          <div class="border-2 px-1 rounded">
            {#if action === 'send'}
              {connection.label}
            {:else if action === 'receive' || action === 'transfer'}
              {#if counterparties && counterparties[0]}
                <!-- see if counterparties is one of our connections -->
                {#await db.connections.get(counterparties[0]) then connection}
                  {#if connection}
                    {connection.label}
                  {:else}
                    {truncateValue(counterparties[0])}
                  {/if}
                {/await}
              {:else}
                {$translate('app.labels.unknown')}
              {/if}
            {:else if channelEvent}
              {#await db.channels.get(channelEvent.channelId) then channel}
                {#if channel}
                  <!-- did we open the channel? -->
                  {@const ourConnectionThatOpenedTheChannel = $connections$.find(
                    ({ info }) => info.id === channel?.opener
                  )}
                  {#if ourConnectionThatOpenedTheChannel}
                    {#await db.connections.get(ourConnectionThatOpenedTheChannel.connectionId) then connection}
                      {connection?.label}
                    {/await}
                  {:else}
                    {truncateValue(channel.opener, 6)}
                  {/if}
                {/if}
              {/await}
            {/if}
          </div>

          <div class="w-4 mx-1 -rotate-90">{@html arrow}</div>

          <div class="border-2 px-1 rounded">
            {#if action === 'receive'}
              {connection.label}
            {:else if action === 'send' || action === 'transfer'}
              {#if counterparties && counterparties[1]}
                <!-- see if counterparties is one of our connections -->
                {#await db.connections.get(counterparties[1]) then connection}
                  {#if connection}
                    {connection.label}
                  {:else}
                    {truncateValue(counterparties[1])}
                  {/if}
                {/await}
              {:else}
                {$translate('app.labels.unknown')}
              {/if}
            {:else if channelEvent}
              {#await db.channels.get(channelEvent.channelId) then channel}
                {#if channel}
                  <!-- did we open the channel? -->
                  {@const ourConnectionThatOpenedTheChannel = $connections$.find(
                    ({ info }) => info.id === channel?.opener
                  )}
                  {#if ourConnectionThatOpenedTheChannel}
                    {#await db.connections.get(ourConnectionThatOpenedTheChannel.connectionId) then connection}
                      {connection?.label}
                    {/await}
                  {:else}
                    {truncateValue(channel.opener, 6)}
                  {/if}
                {/if}
              {/await}
            {/if}
          </div>
        </div>
      </div>
    </div>

    <div class="flex items-center">
      {#if balanceChange}
        <div>
          <div class="flex justify-end text-xs">{$translate('app.labels.balance_change')}</div>

          <div class="flex items-center">
            <div
              class="mr-1 font-semibold text-lg font-mono"
              class:text-utility-success={tags.includes('income')}
              class:text-utility-error={tags.includes('expense')}
            >
              {tags.includes('income') ? '+' : tags.includes('expense') ? '-' : ''}
            </div>

            <BitcoinAmount msat={balanceChange} />
          </div>

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
      {/if}

      <div class="flex items-center h-full ml-1">
        <div class="w-6 flex-shrink-0 -rotate-90">{@html caret}</div>
      </div>
    </div>
  </a>
{/if}
