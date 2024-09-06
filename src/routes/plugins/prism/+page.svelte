<script lang="ts">
  import { connections$ } from '$lib/streams'
  import type { Connection } from '$lib/wallets/interfaces'
  import type { PageData } from './$types'
  import prismIcon from '$lib/icons/prism'
  import { translate } from '$lib/i18n/translations'
  import PrismRow from './PrismRow.svelte'
  import ItemsList from '$lib/components/ItemsList.svelte'
  import { getFilters, getSorters, getTags } from '$lib/filters'
  import type { Filter, Sorters } from '$lib/@types/common'
  import type { PrismType } from '$lib/@types/plugins'

  export let data: PageData
  const { wallet } = data

  let loading = true
  let prismActive = false
  let prisms: PrismType[] | [] = []

  $: connection = $connections$.find(({ walletId }) => walletId === wallet) as Connection

  $: {
    if (connection) {
      connection.plugins?.list().then(plugins => {
        const prismPlugin = plugins.find(plugin => plugin.name.includes('bolt12-prism'))
        prismActive = prismPlugin ? prismPlugin.active : false
        listPrisms()
      })
    }
  }

  function listPrisms() {
    loading = true
    connection.prism?.listPrisms().then(response => {
      prisms = response
      loading = false
    })
  }

  $: console.log(`prisms = `, prisms)

  const route = 'prisms'
  const rowSize = 102
  const filters: Filter[] = getFilters(route)
  const sorters: Sorters = getSorters(route)
  const tags: string[] = getTags(route)

  const sync = async (connection: Connection) => {
    loading = true
    try {
      const response = await connection.prism?.listPrisms()
      if (response) {
        prisms = response
      }
    } catch (error) {
      console.error('Error syncing prisms:', error)
    } finally {
      loading = false
    }
  }

  const button = {
    href: '/plugins/prism/create',
    text: $translate('app.labels.create'),
    icon: prismIcon
  }
</script>

<svelte:head>
  <title>{$translate('app.routes./plugins/prism.title')}</title>
</svelte:head>

<ItemsList {route} {rowSize} {filters} {sorters} {sync} {tags} {button}>
  <div slot="row" let:item>
    <PrismRow prism={item} />
  </div>
</ItemsList>
