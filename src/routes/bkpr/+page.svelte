<script>
  import BackButton from '$lib/elements/BackButton.svelte'
  import RoutingPerformance from './components/RoutingPerformance.svelte'
  import AccountInsights from './components/AccountInsights.svelte'
  import AccountingExports from './components/AccountingExports.svelte'
  import { translate } from '$lib/i18n/translations'
  import { goto } from '$app/navigation'
  import lightning from '$lib/lightning'
  import { onMount } from 'svelte'

  // Fetch bookkeeper channels apy
  onMount(() => {
    lightning.updateChannelsAPY()
    lightning.updateIncomeEvents()
  })
</script>

<svelte:head>
  <title>{$translate('app.titles.bkpr')}</title>
</svelte:head>

<BackButton on:click={() => goto('/')} />

<div class="w-full h-full flex overflow-hidden flex-col justify-center items-center p-6">
  <div class="h-28 w-full" />
  <div
    class="grid gap-4 grid-cols-1 overflow-scroll md:grid-flow-col-dense p-2 md:auto-cols-min md:auto-rows-fr"
  >
    <RoutingPerformance />
    <AccountInsights />
    <AccountingExports />
  </div>
</div>
