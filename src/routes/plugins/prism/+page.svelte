<script lang="ts">
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import Spinner from '$lib/components/Spinner.svelte'
  import { connections$ } from '$lib/streams'
  import type { Connection } from '$lib/wallets/interfaces'
  import type { PageData } from './$types'
  import prismIcon from '$lib/icons/prism'
  import { translate } from '$lib/i18n/translations'
  import PrismRow from './PrismRow.svelte'
  import ItemsList from '$lib/components/ItemsList.svelte'
  import { getFilters, getSorters, getTags } from '$lib/filters'
  import { Filter, Sorters } from '$lib/@types/common'

  export let data: PageData
  const { wallet } = data

  let loading = true
  let prismActive = false
  let prisms = {}

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

  const button = {
    href: '/offers/offer/create',
    text: $translate('app.labels.create'),
    icon: prismIcon
  }
</script>

<svelte:head>
  <title>{$translate('app.routes./plugins/prism.title')}</title>
</svelte:head>

{#if loading}
  <div class="mt-8">
    <Spinner size="1.5em" />
  </div>
{:else}
  <!-- <Section>
    <div class="flex items-center justify-between gap-x-4">
      <SectionHeading icon={prismIcon} />
    </div>
  </Section> -->
  <ItemsList {route} {rowSize} {filters} {sorters} sync={listPrisms} {tags} {button}>
    <div slot="row" let:item>
      <PrismRow offer={item} />
    </div>
  </ItemsList>
{/if}
