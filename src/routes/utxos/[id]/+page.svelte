<script lang="ts">
  import { formatDate } from '$lib/dates.js'
  import { db } from '$lib/db.js'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import ExpiryCountdown from '$lib/components/ExpiryCountdown.svelte'
  import Msg from '$lib/components/Msg.svelte'
  import Qr from '$lib/components/Qr.svelte'
  import Section from '$lib/components/Section.svelte'
  import Spinner from '$lib/components/Spinner.svelte'
  import SummaryRow from '$lib/components/SummaryRow.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import check from '$lib/icons/check.js'
  import warning from '$lib/icons/warning.js'
  import { fade } from 'svelte/transition'
  import type { PageData } from './$types.js'
  import CopyValue from '$lib/components/CopyValue.svelte'
  import { truncateValue } from '$lib/utils.js'
  import link from '$lib/icons/link.js'
  import { liveQuery } from 'dexie'
  import { first, from, take, timestamp } from 'rxjs'
  import keys from '$lib/icons/keys.js'
  import caret from '$lib/icons/caret.js'

  export let data: PageData

  /** utxi id **/
  const { id } = data

  const utxo$ = from(liveQuery(() => db.utxos.get(id)))
  let utxoNotFound = false

  utxo$.pipe(take(1)).subscribe((utxo) => {
    if (!utxo) {
      utxoNotFound = true
    }
  })
</script>

<svelte:head>
  <title>{$translate('app.routes./utxo.title')}</title>
</svelte:head>

<Section>
  {#if utxoNotFound}
    <div class="mt-4">
      <Msg type="error" closable={false} message={$translate('app.errors.utxo_not_found')} />
    </div>
  {:else if !$utxo$}
    <div class="mt-4">
      <Spinner />
    </div>
  {:else}
    {@const {
      status,
      txid,
      timestamp,
      amount,
      connectionId,
      address,
      reserved,
      reservedToBlock,
      spendingTxid
    } = $utxo$}

    <div class="w-full flex justify-center items-center text-3xl font-semibold">
      <div class="w-8 mr-1.5">{@html keys}</div>
      <div>
        {$translate('app.routes./utxo.title')}
      </div>
    </div>

    <div class="flex items-center w-full justify-center text-2xl">
      <BitcoinAmount msat={amount} />
    </div>

    <div class="w-full flex justify-center mt-2">
      <div class="w-full max-w-lg">
        <!-- CONNECTION -->
        <SummaryRow>
          <span slot="label">{$translate('app.labels.connection')}:</span>
          <a
            href={`/connections/${connectionId}`}
            slot="value"
            class="no-underline flex items-center"
          >
            {#await db.connections.get(connectionId) then connection}
              {connection?.label}
            {/await}
            <div class="w-6 ml-1 -rotate-90">{@html caret}</div></a
          >
        </SummaryRow>

        <!-- STATUS -->
        <SummaryRow>
          <span slot="label">{$translate('app.labels.status')}:</span>
          <span
            class:text-utility-success={status === 'confirmed'}
            class:text-utility-error={status === 'spent'}
            class:text-utility-pending={status === 'immature' || status === 'unconfirmed'}
            class="flex items-center"
            slot="value"
          >
            {status}
            {#if status === 'immature' || status === 'unconfirmed'}
              <div class="ml-1">
                <Spinner size="1rem" />
              </div>
            {/if}

            {#if status === 'confirmed'}
              <div class="w-4 ml-1 border border-utility-success rounded-full">
                {@html check}
              </div>
            {/if}
          </span>
        </SummaryRow>

        <!-- TIMESTAMP -->
        {#if timestamp}
          <SummaryRow>
            <span slot="label"
              >{$translate(`app.labels.${status === 'spent' ? 'spent' : 'received'}`)}:</span
            >
            <span slot="value">
              {#await formatDate(timestamp) then formatted}
                <span in:fade|local={{ duration: 50 }}>{formatted}</span>
              {/await}
            </span>
          </SummaryRow>
        {/if}

        <!-- ADDRESS -->
        <SummaryRow>
          <div slot="label">{$translate('app.labels.address')}</div>
          <div slot="value">
            <CopyValue value={address} truncateLength={8} />
          </div>
        </SummaryRow>

        <!-- TXID -->
        <SummaryRow>
          <div slot="label">{$translate('app.labels.receive_transaction')}</div>
          <a class="no-underline flex items-center" href={`/transactions/${txid}`} slot="value"
            >{truncateValue(txid)}
            <div class="-rotate-90 w-6 ml-1">{@html caret}</div>
          </a>
        </SummaryRow>

        <!-- RECEIVE INFO -->
        {#await db.addresses.where('value').equals(address).first() then addressInfo}
          {#if addressInfo}
            {@const { message, label } = addressInfo}

            {#if label}
              <SummaryRow>
                <div slot="label">{$translate('app.labels.label')}</div>
                <div slot="value">{label}</div>
              </SummaryRow>
            {/if}

            {#if message}
              <SummaryRow>
                <div slot="label">{$translate('app.labels.description')}</div>
                <div slot="value">{message}</div>
              </SummaryRow>
            {/if}
          {/if}
        {/await}

        {#if reserved && reservedToBlock}
          <SummaryRow>
            <div slot="label">{$translate('app.labels.reserved_to_block')}</div>
            <div slot="value">{reservedToBlock}</div>
          </SummaryRow>
        {/if}

        {#if spendingTxid}
          <SummaryRow>
            <div slot="label">{$translate('app.labels.spend_transaction')}</div>
            <a
              class="no-underline flex items-center"
              href={`/transactions/${spendingTxid}`}
              slot="value"
              >{truncateValue(spendingTxid)}
              <div class="-rotate-90 w-6 ml-1">{@html caret}</div>
            </a>
          </SummaryRow>
        {/if}
      </div>
    </div>
  {/if}
</Section>
