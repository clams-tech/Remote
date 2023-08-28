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
  import type { Movement } from '$lib/@types/movement.js'
  import { deriveInvoiceMovement, deriveTransactionMovement } from '$lib/movement.js'

  export let type: 'invoice' | 'address' | 'transaction'
  export let data: Invoice | Address | (Transaction & { receiveAddress?: Address })

  let formatted = false
  let icon: string
  let status: TransactionStatus
  let balanceChange: Movement['balanceChange']
  let channelEvent: Transaction['channel']
  let description: string | undefined
  let request: string | undefined
  let category: Movement['category']
  let from: Movement['from']
  let to: Movement['to']
  let wallet: Wallet
  let action: string

  const formatData = async () => {
    wallet = (await db.wallets.get(data.walletId)) as Wallet

    if (type === 'invoice') {
      const {
        status: invoiceStatus,
        description: invoiceDescription,
        offer,
        request: invoiceRequest
      } = data as Invoice

      icon = lightning
      status = invoiceStatus

      const movement = deriveInvoiceMovement(data as Invoice)

      balanceChange = movement.balanceChange
      from = movement.from
      to = movement.to
      category = movement.category
      description = invoiceDescription || offer?.description
      request = invoiceRequest
    } else if (type === 'address') {
      const { amount: addressAmount, message: addressDescription, createdAt } = data as Address
      icon = bitcoin
      status = 'pending'
      category = 'income'
      from = undefined
      to = data.walletId
      balanceChange = addressAmount
      description = addressDescription
    } else if (type === 'transaction') {
      const { blockheight, receiveAddress, channel } = data as Transaction & {
        receiveAddress?: Address
      }

      icon = bitcoin
      status = typeof blockheight === 'number' ? 'complete' : 'pending'

      if (receiveAddress && receiveAddress.message) {
        description = receiveAddress.message
      }

      channelEvent = channel

      const movement = await deriveTransactionMovement(data as Transaction)

      balanceChange = movement.balanceChange
      from = movement.from
      to = movement.to
      category = movement.category
    }

    action =
      category === 'income'
        ? 'receive'
        : category === 'expense'
        ? 'send'
        : category === 'transfer'
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
      <div>
        <div class="mr-2 font-semibold">
          {$translate(`app.labels.${action}`)}
        </div>

        <div class="text-xs font-semibold flex items-center mt-1 lowercase">
          <div class="border-2 px-1 rounded">
            {#if action === 'send'}
              {wallet.label}
            {:else if action === 'receive' || action === 'transfer'}
              {#if from}
                <!-- see if counterparties is one of our wallets -->
                {#await db.wallets.get(from) then wallet}
                  {#if wallet}
                    {wallet.label}
                  {:else}
                    {truncateValue(from)}
                  {/if}
                {/await}
              {:else}
                {$translate('app.labels.unknown')}
              {/if}
            {:else if channelEvent}
              {#await db.channels.get(channelEvent.channelId) then channel}
                {#if channel}
                  <!-- did we open the channel? -->
                  {@const ourwalletThatOpenedTheChannel = $connections$.find(
                    ({ info }) => info.id === channel?.opener
                  )}

                  {#if ourwalletThatOpenedTheChannel}
                    {#await db.wallets.get(ourwalletThatOpenedTheChannel.walletId) then wallet}
                      {wallet?.label}
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
              {wallet.label}
            {:else if action === 'send' || action === 'transfer'}
              {#if to}
                <!-- see if counterparties is one of our wallets -->
                {#await db.wallets.get(to) then wallet}
                  {#if wallet}
                    {wallet.label}
                  {:else}
                    {truncateValue(to)}
                  {/if}
                {/await}
              {:else}
                {$translate('app.labels.unknown')}
              {/if}
            {:else if channelEvent}
              {#await db.channels.get(channelEvent.channelId) then channel}
                {#if channel}
                  <!-- did we open the channel? -->
                  {@const ourwalletThatOpenedTheChannel = $connections$.find(
                    ({ info }) => info.id === channel?.opener
                  )}
                  {#if ourwalletThatOpenedTheChannel}
                    {#await db.wallets.get(ourwalletThatOpenedTheChannel.walletId) then wallet}
                      {wallet?.label}
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
              class:text-utility-success={category === 'income'}
              class:text-utility-error={category === 'expense' ||
                (category === 'transfer' && balanceChange)}
            >
              {category === 'income'
                ? '+'
                : category === 'expense' || (category === 'transfer' && balanceChange)
                ? '-'
                : ''}
            </div>

            <BitcoinAmount sats={balanceChange} />
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
