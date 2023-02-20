<script lang="ts">
  import { convertValue } from '$lib/conversion'
  import { BitcoinDenomination } from '$lib/types'
  import { truncateValue } from '$lib/utils'
  import { onDestroy, onMount } from 'svelte'
  import { channelsAPY$ } from '$lib/streams'
  import { translate } from '$lib/i18n/translations'
  import type { ChannelAPY } from '$lib/backends'
  import type { Chart, ChartItem } from 'chart.js'

  let showZeroFeesMessage = false
  let feesChart: Chart<'pie', number[], string>
  let apyChart: Chart<'pie', number[], string>

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

  $: net = channelsAPY$.value.data?.filter((item) => item.account === 'net')

  $: channels = channelsAPY$.value.data?.filter((item) => item.account !== 'net')

  async function renderFeesChart(channels: ChannelAPY[]) {
    const { Chart } = await import('chart.js/auto')

    let labels: string[] = []
    let data: number[] = []

    channels?.forEach(({ account, fees_in_msat, fees_out_msat }) => {
      const routingFees = fees_in_msat + fees_out_msat

      if (routingFees) {
        const value = Math.round(
          Number(
            convertValue({
              value: routingFees.toString(),
              from: BitcoinDenomination.msats,
              to: BitcoinDenomination.sats
            })
          )
        )

        labels.push(truncateValue(account, 5))
        data.push(value)
      }
    })

    // If chart exists, update data
    if (feesChart) {
      feesChart.data.datasets[0].data = data
    } else {
      // Create new chart
      const el = document.getElementById(ChartIDs.fees) as ChartItem

      if (el) {
        feesChart = new Chart(el, {
          type: 'pie',
          data: {
            labels,
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

    let labels: string[] = []
    let data: number[] = []

    channels?.forEach(({ account, apy_total }) => {
      const total = Number(apy_total.substring(0, apy_total.length - 1))

      if (total) {
        labels.push(truncateValue(account, 5))
        data.push(Number(apy_total.substring(0, apy_total.length - 1)))
      }
    })

    // If chart exists, update data
    if (apyChart) {
      apyChart.data.datasets[0].data = data
      return
    } else {
      // Create new chart
      const el = document.getElementById(ChartIDs.apy) as ChartItem

      if (el) {
        apyChart = new Chart(el, {
          type: 'pie',
          data: {
            labels,
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

  onMount(async () => {
    if (net && net[0]?.fees_in_msat + net[0]?.fees_out_msat === 0) {
      showZeroFeesMessage = true
      return
    }

    if (channels) {
      await renderFeesChart(channels)
      await renderApyChart(channels)
    }
  })

  onDestroy(() => {
    feesChart.destroy()
    apyChart.destroy()
  })
</script>

<section class="p-6 max-w-md">
  <h1 class="text-4xl mb-6 font-bold">{$translate('app.headings.account_insights')}</h1>
  <p>
    {showZeroFeesMessage
      ? $translate('app.subheadings.account_insights_fallback')
      : $translate('app.subheadings.account_insights')}
  </p>
  <section class="mt-6 w-full flex justify-between flex-wrap gap-6">
    {#each charts as { title, id }}
      <div class="flex flex-col flex-wrap">
        <h3 class="text-sm text-neutral-400">{title}</h3>
        <canvas height="auto" width="auto" class="block" {id} />
      </div>
    {/each}
  </section>
</section>
