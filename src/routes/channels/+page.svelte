<script lang="ts">
  import plus from '$lib/icons/plus.js'
  import { translate } from '$lib/i18n/translations.js'
  import { fetchChannels } from '$lib/wallets/index.js'
  import type { Filter, Sorters } from '$lib/@types/common.js'
  import { getFilters, getSorters, getTags } from '$lib/filters.js'
  import type { Connection } from '$lib/wallets/interfaces.js'
  import ItemsList from '$lib/components/ItemsList.svelte'
  import ChannelRow from './ChannelRow.svelte'

  const route = 'channels'
  const rowSize = 102.25
  const filters: Filter[] = getFilters(route)
  const sorters: Sorters = getSorters(route)
  const tags: string[] = getTags(route)

  const sync = async (connection: Connection) => {
    await fetchChannels(connection)
  }

  const button = {
    href: '/channel/open',
    text: $translate('app.labels.open'),
    icon: plus
  }
</script>

<ItemsList {filters} {sorters} {tags} {sync} {button} {route} {rowSize}>
  <div slot="row" let:item>
    <ChannelRow channel={item} />
  </div>
</ItemsList>
