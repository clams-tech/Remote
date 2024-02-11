<script lang="ts">
  import { fetchForwards } from '$lib/wallets/index.js'
  import type { Filter, Sorters } from '$lib/@types/common.js'
  import { getFilters, getSorters, getTags } from '$lib/filters.js'
  import type { Connection } from '$lib/wallets/interfaces.js'
  import ItemsList from '$lib/components/ItemsList.svelte'
  import ForwardRow from './ForwardRow.svelte'
  import { translate } from '$lib/i18n/translations.js'

  const route = 'forwards'
  const rowSize = 96
  const filters: Filter[] = getFilters(route)
  const sorters: Sorters = getSorters(route)
  const tags: string[] = getTags(route)

  const sync = async (connection: Connection) => {
    await fetchForwards(connection)
  }
</script>

<svelte:head>
  <title>{$translate(`app.routes./forwards.title`)}</title>
</svelte:head>

<ItemsList {filters} {sorters} {tags} {sync} {route} {rowSize}>
  <div class="w-full overflow-hidden" slot="row" let:item>
    <ForwardRow forward={item} />
  </div>
</ItemsList>
