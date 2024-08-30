<script lang="ts">
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import Spinner from '$lib/components/Spinner.svelte'
  import { connections$ } from '$lib/streams'
  import type { Connection } from '$lib/wallets/interfaces'
  import type { PageData } from './$types'

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
</script>

{#if loading}
  <div class="mt-8">
    <Spinner size="1.5em" />
  </div>
{:else}
  <Section>
    <div class="flex items-center justify-between gap-x-4">
      <SectionHeading />
    </div>
  </Section>
{/if}
