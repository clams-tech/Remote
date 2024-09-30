<script lang="ts">
  import type { Connection } from '$lib/wallets/interfaces'
  import type { PageData } from './$types'
  import prismIcon from '$lib/icons/prism'
  import { translate } from '$lib/i18n/translations'
  import PrismRow from './PrismRow.svelte'
  import ItemsList from '$lib/components/ItemsList.svelte'
  import { getSorters, getTags } from '$lib/filters'
  import type { Sorters } from '$lib/@types/common'
  import { fetchPrismBindings, fetchPrisms } from '$lib/wallets'

  export let data: PageData
  const { wallet } = data

  const route = 'prisms'
  const rowSize = 90
  const sorters: Sorters = getSorters(route)
  const tags: string[] = getTags(route)

  const sync = async (connection: Connection) => {
    await Promise.all([fetchPrisms(connection), fetchPrismBindings(connection)])
  }

  const button = {
    href: `/plugins/prism/create?wallet=${wallet}`,
    text: $translate('app.labels.create'),
    icon: prismIcon
  }
</script>

<svelte:head>
  <title>{$translate('app.routes./plugins/prism.title')}</title>
</svelte:head>

<ItemsList {route} {rowSize} filters={[]} {sorters} {sync} {tags} {button}>
  <div slot="row" let:item>
    <PrismRow prism={item} wallet={wallet || ''} />
  </div>
</ItemsList>
