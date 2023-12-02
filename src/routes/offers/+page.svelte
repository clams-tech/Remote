<script lang="ts">
  import OfferRow from './OfferRow.svelte'
  import plus from '$lib/icons/plus.js'
  import { translate } from '$lib/i18n/translations.js'
  import { fetchInvoices, fetchOffers } from '$lib/wallets/index.js'
  import type { Filter, Sorters } from '$lib/@types/common.js'
  import { getFilters, getSorters, getTags } from '$lib/filters.js'
  import type { Connection } from '$lib/wallets/interfaces.js'
  import ItemsList from '$lib/components/ItemsList.svelte'

  const route = 'offers'
  const rowSize = 102
  const filters: Filter[] = getFilters(route)
  const sorters: Sorters = getSorters(route)
  const tags: string[] = getTags(route)

  const sync = async (connection: Connection) => {
    await Promise.all([fetchOffers(connection), fetchInvoices(connection)])
  }

  const button = {
    href: '/offers/offer/create',
    text: $translate('app.labels.create'),
    icon: plus
  }
</script>

<svelte:head>
  <title>{$translate(`app.routes./offers.title`)}</title>
</svelte:head>

<ItemsList {filters} {sorters} {tags} {sync} {button} {route} {rowSize}>
  <div slot="row" let:item>
    <OfferRow offer={item} />
  </div>
</ItemsList>
