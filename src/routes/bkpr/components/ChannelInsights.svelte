<script lang="ts">
  import { convertValue } from '$lib/conversion'
  import { BitcoinDenomination } from '$lib/types'
  import { truncateValue } from '$lib/utils'
  import { onDestroy } from 'svelte'
  import { channelsAPY$, nodes$ } from '$lib/streams'
  import { translate } from '$lib/i18n/translations'
  import type { ChannelAPY } from '$lib/backends'
  import type { Chart, ChartItem } from 'chart.js'
  import Big from 'big.js'
  import Spinner from '$lib/elements/Spinner.svelte'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'
  import info from '$lib/icons/info'

  let feesChart: Chart<'pie', number[], string>
  let apyChart: Chart<'pie', number[], string>
  let nodeLabels: string[]

  enum ChartIDs {
    fees = 'fees',
    apy = 'apy'
  }

  const charts = [
    {
      id: ChartIDs.fees,
      title: $translate('app.labels.routing_chart')
    },
    {
      id: ChartIDs.apy,
      title: $translate('app.labels.apy_chart')
    }
  ]

  $: ({ net, channels } = ($channelsAPY$.data || []).reduce(
    (acc, item) => {
      acc[item.account === 'net' ? 'net' : 'channels'].push(item)
      return acc
    },
    { net: [], channels: [] } as { net: ChannelAPY[]; channels: ChannelAPY[] }
  ))

  $: noRoutingFees =
    net &&
    Big(net[0]?.fees_in_msat || '0')
      .plus(net[0]?.fees_out_msat || '0')
      .toString() === '0'

  $: noAPY = net && net[0]?.apy_total.slice(0, -1) === '0.0000'

  // create data for chart labels
  $: {
    if (channels.length && $nodes$.data?.length) {
      nodeLabels = channels
        .filter(({ fees_in_msat }) => fees_in_msat !== '0')
        .map(({ account }) => {
          const match = $nodes$.data?.find((node) => node.accounts.includes(account))
          return match ? `${match.alias}: ${truncateValue(account, 3)}` : truncateValue(account, 3)
        })
    }
  }

  // @TODO - only show data labels next to charts if less than 10 (channel details willl be visible on hover)
  $: if (feesChart && apyChart && nodeLabels) {
    feesChart.data.labels = nodeLabels
    apyChart.data.labels = nodeLabels
    feesChart.update()
    apyChart.update()
  }

  $: if (channels && !noRoutingFees) {
    renderFeesChart(channels)

    if (!noAPY) {
      renderApyChart(channels)
    }
  }

  async function renderFeesChart(channels: ChannelAPY[]) {
    const { Chart } = await import('chart.js/auto')

    let data: number[] = []

    channels.forEach(({ fees_in_msat }) => {
      const value = convertValue({
        value: fees_in_msat.toString(),
        from: BitcoinDenomination.msats,
        to: BitcoinDenomination.sats
      })

      if (value && value !== '0') {
        data.push(parseFloat(value))
      }
    })

    // If chart exists, update data
    if (feesChart) {
      feesChart.data = { datasets: [{ data }] }
      feesChart.update()
    } else {
      // Create new chart
      const el = document.getElementById(ChartIDs.fees) as ChartItem

      if (el) {
        feesChart = new Chart(el, {
          type: 'pie',
          data: {
            datasets: [
              {
                data
              }
            ]
          }
        })
      }
    }
  }

  async function renderApyChart(channels: ChannelAPY[]) {
    const { Chart } = await import('chart.js/auto')

    let data: number[] = []

    channels.forEach(({ apy_in }) => {
      const apy = parseFloat(apy_in.slice(0, -1))

      if (apy) {
        data.push(apy)
      }
    })

    // If chart exists, update data
    if (apyChart) {
      apyChart.data = { datasets: [{ data }] }
      apyChart.update()
      return
    } else {
      // Create new chart
      const el = document.getElementById(ChartIDs.apy) as ChartItem

      if (el) {
        apyChart = new Chart(el, {
          type: 'pie',
          data: {
            datasets: [
              {
                data
              }
            ]
          }
        })
      }
    }
  }

  onDestroy(() => {
    feesChart && feesChart.destroy()
    apyChart && apyChart.destroy()
  })

  // @TODO - Switch out fees_in_msat for fees_out_msat everywhere in this component if this is the correct value to use for income
</script>

<section
  class="p-4 border border-current rounded-md md:row-span-2 w-full shadow-sm shadow-purple-400"
>
  <h1 class="text-2xl mb-6 font-bold">{$translate('app.headings.account_insights')}</h1>
  <p>
    {$translate('app.subheadings.account_insights')}
  </p>

  {#if $channelsAPY$.loading}
    <section class="w-full py-6 flex items-center justify-center">
      <Spinner />
    </section>
  {:else if $channelsAPY$.error}
    <div class="flex items-center justify-center">
      <ErrorMsg message={$channelsAPY$.error} closable={false} />
    </div>
  {:else}
    <section class="mt-6 flex flex-wrap">
      {#if noRoutingFees}
        <div class="flex items-center w-full">
          <div class="text-utility-pending p-2 border border-current rounded flex items-start">
            <div class="w-6 mr-2 border border-current rounded-full">{@html info}</div>
            <span class="text-sm">{$translate('app.hints.no_routing_fees')}</span>
          </div>
        </div>
      {:else}
        {#each charts as { title, id }}
          {#if id !== 'apy' || !noAPY}
            <div>
              <h3 class="text-sm text-neutral-400">{title}</h3>
              <div class="flex relative">
                <canvas {id} width="auto" height="auto" />
              </div>
            </div>
          {/if}
        {/each}
      {/if}
    </section>
  {/if}
</section>
