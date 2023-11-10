<script lang="ts">
  import PaymentRow from './PaymentRow.svelte'
  import plus from '$lib/icons/plus.js'
  import { translate } from '$lib/i18n/translations.js'
  import { fetchInvoices, fetchTransactions, fetchUtxos } from '$lib/wallets/index.js'
  import type { Filter, Sorters } from '$lib/@types/common.js'
  import { getFilters, getSorters, getTags } from './filters.js'
  import type { Connection } from '$lib/wallets/interfaces.js'
  import ItemsList from '$lib/components/ItemsList.svelte'

  const filters: Filter[] = getFilters()
  const sorters: Sorters = getSorters()
  const tags: string[] = getTags()

  const sync = async (connection: Connection) => {
    await Promise.all([
      fetchInvoices(connection),
      fetchTransactions(connection),
      fetchUtxos(connection)
    ])
  }

  const button = {
    href: '/payments/receive',
    text: $translate('app.labels.receive'),
    icon: plus
  }

  const noItemsMessage = (filtersApplied: boolean) =>
    $translate(`app.labels.${filtersApplied ? 'no_payments_filtered' : 'no_payments'}`)
</script>

<ItemsList
  {filters}
  {sorters}
  {tags}
  {sync}
  {button}
  {noItemsMessage}
  table="payments"
  rowSize={88}
>
  <div slot="row" let:item>
    <PaymentRow payment={item} />
  </div>
</ItemsList>
