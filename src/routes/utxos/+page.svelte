<script lang="ts">
  import { fetchTransactions, fetchUtxos } from '$lib/wallets/index.js'
  import type { Filter, Sorters } from '$lib/@types/common.js'
  import { getFilters, getSorters, getTags } from '$lib/filters.js'
  import type { Connection } from '$lib/wallets/interfaces.js'
  import ItemsList from '$lib/components/ItemsList.svelte'
  import UtxoRow from './UtxoRow.svelte'
  import type { Utxo } from '$lib/@types/utxos.js'
  import SummaryRow from '$lib/components/SummaryRow.svelte'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import { translate } from '$lib/i18n/translations.js'

  const route = 'utxos'
  const rowSize = 72
  const maxAmountUtxosToFetch = 500
  const filters: Filter[] = getFilters(route)
  const sorters: Sorters = getSorters(route)
  const tags: string[] = getTags(route)

  const sync = async (connection: Connection) => {
    await Promise.all([fetchUtxos(connection), fetchTransactions(connection)])
  }

  let utxos: Utxo[] = []

  $: totals = utxos.length
    ? utxos.reduce(
        (acc, utxo) => {
          const { amount, status } = utxo

          if (status !== 'spent' && status !== 'spent_unconfirmed') {
            acc.balance += amount
            acc.num += 1

            if (status !== 'immature') {
              acc.sendable += amount
            }
          }

          return acc
        },
        { balance: 0, sendable: 0, num: 0 }
      )
    : null
</script>

<svelte:head>
  <title>{$translate(`app.routes./utxos.title`)}</title>
</svelte:head>

<ItemsList
  {filters}
  {sorters}
  {tags}
  {sync}
  {route}
  {rowSize}
  limit={maxAmountUtxosToFetch}
  bind:items={utxos}
>
  <div slot="summary">
    {#if totals}
      <div class="w-full mb-2">
        <SummaryRow>
          <div slot="label">{$translate('app.labels.total')}:</div>
          <div slot="value">{totals?.num} utxo{totals?.num && totals.num > 1 ? 's' : ''}</div>
        </SummaryRow>

        <SummaryRow>
          <div slot="label">{$translate('app.labels.balance')}:</div>
          <div slot="value">
            {#if totals}
              <BitcoinAmount sats={totals.balance} />
            {/if}
          </div>
        </SummaryRow>

        <SummaryRow>
          <div slot="label">{$translate('app.labels.spendable')}:</div>
          <div slot="value">
            {#if totals}
              <BitcoinAmount sats={totals.sendable} />
            {/if}
          </div>
        </SummaryRow>
      </div>
    {/if}
  </div>

  <div slot="row" let:item>
    <UtxoRow utxo={item} />
  </div>
</ItemsList>
