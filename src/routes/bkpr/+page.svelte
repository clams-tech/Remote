<script>
  import BackButton from '$lib/elements/BackButton.svelte'
  import RoutingPerformance from './components/RoutingPerformance.svelte'
  import RoutingFeesHistory from './components/RoutingFeesHistory.svelte'
  import ChannelInsights from './components/ChannelInsights.svelte'
  import AccountingExports from './components/AccountingExports.svelte'
  import { translate } from '$lib/i18n/translations'
  import { goto } from '$app/navigation'
  import lightning from '$lib/lightning'
  import { onMount } from 'svelte'
  import graph from '$lib/icons/graph'
  import { balances$, nodes$ } from '$lib/streams'

  // Fetch bookkeeper channels apy, income events & balances
  onMount(() => {
    lightning.updateChannelsAPY()
    lightning.updateIncomeEvents()
    lightning.updateListBalances()
  })

  // @TODO
  // accommodate a ton of accounts to prevent rate limit on node
  // add node alias to all charts
  $: if ($balances$.data) {
    $balances$.data.forEach((balance) => {
      if (balance.account !== 'wallet' && balance.peer_id) {
        lightning.updateListNodes(balance.peer_id)
      }
    })
  }
</script>

<svelte:head>
  <title>{$translate('app.titles./bkpr')}</title>
</svelte:head>

<BackButton on:click={() => goto('/')} />

<div class="w-full h-full flex overflow-hidden flex-col items-center justify-center p-4 pt-16">
  <div class="h-full overflow-auto">
    <div class="flex items-center mb-6">
      <div class="w-10 mr-2">{@html graph}</div>
      <h1 class="text-4xl font-bold">
        {$translate('app.titles./bkpr')}
      </h1>
    </div>
    <div
      class="grid gap-4 overflow-auto auto-cols-min auto-rows-min md:grid-cols-2 grid-cols-1 md:grid-flow-col-dense p-1 w-full max-w-3xl"
    >
      <RoutingPerformance />
      <ChannelInsights />
      <AccountingExports />
    </div>
    <div class="mt-2 p-1 w-full max-w-3xl">
      <RoutingFeesHistory />
    </div>
  </div>
</div>
