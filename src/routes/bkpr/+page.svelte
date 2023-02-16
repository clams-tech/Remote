<script>
  import BackButton from '$lib/elements/BackButton.svelte'
  import RoutingPerformance from '$lib/components/RoutingPerformance.svelte'
  import AccountInsights from '$lib/components/AccountInsights.svelte'
  import AccountingExports from '$lib/components/AccountingExports.svelte'
  import { translate } from '$lib/i18n/translations'
  import { goto } from '$app/navigation'
  import lightning from '$lib/lightning'
  import { onMount } from 'svelte'
  import { channelsAPY$ } from '$lib/streams'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'
  import Spinner from '$lib/elements/Spinner.svelte'

  // Fetch bookkeeper channels apy
  onMount(() => {
    lightning.updateChannelsAPY(lightning.getLn())
  })
</script>

<svelte:head>
  <title>{$translate('app.titles.bkpr')}</title>
</svelte:head>

<BackButton on:click={() => goto('/')} />

<div class="overflow-scroll">
  {#if $channelsAPY$.loading && !$channelsAPY$.data}
    <div class="flex flex-col items-center justify-center">
      <Spinner />
      <p class="mt-2">{$translate('app.loading.channels_apy')}</p>
    </div>
  {:else if $channelsAPY$.error}
    <div class="flex items-center justify-center">
      <ErrorMsg message={$channelsAPY$.error} />
    </div>
  {:else}
    <RoutingPerformance />
    <AccountInsights />
  {/if}
  <AccountingExports />
</div>
