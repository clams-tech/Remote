<script lang="ts">
  import { fetchUtxos } from '$lib/wallets/index.js'
  import type { Filter, Sorters } from '$lib/@types/common.js'
  import { getFilters, getSorters, getTags } from '$lib/filters.js'
  import type { Connection } from '$lib/wallets/interfaces.js'
  import ItemsList from '$lib/components/ItemsList.svelte'
  import UtxoRow from './UtxoRow.svelte'

  const route = 'utxos'
  const rowSize = 72
  const filters: Filter[] = getFilters(route)
  const sorters: Sorters = getSorters(route)
  const tags: string[] = getTags(route)

  const sync = async (connection: Connection) => {
    await fetchUtxos(connection)
  }
</script>

<ItemsList {filters} {sorters} {tags} {sync} {route} {rowSize}>
  <div slot="row" let:item>
    <UtxoRow utxo={item} />
  </div>
</ItemsList>
