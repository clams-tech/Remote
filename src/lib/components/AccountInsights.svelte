<script lang="ts">
  import { convertValue } from '$lib/conversion'
  import { BitcoinDenomination } from '$lib/types'
  import { truncateValue } from '$lib/utils'
  import Chart, { type ChartItem } from 'chart.js/auto'
  import { onDestroy, onMount } from 'svelte'
  import { channelsAPY$ } from '$lib/streams'
  import { translate } from '$lib/i18n/translations'
  import type { ChannelAPY } from '$lib/backends'

  const charts = [
    {
      id: 'routingFeesByAccountChart',
      title: $translate('app.labels.routing_chart')
    },
    {
      id: 'apyByAccountChart',
      title: $translate('app.labels.apy_chart')
    }
  ]

  function renderRoutingFeesByAccountChart(channels: ChannelAPY[]) {
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

    const el: ChartItem | null = document.getElementById('routingFeesByAccountChart') as ChartItem

    if (el) {
      new Chart(el, {
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

  function renderApyByAccountChart(channels: ChannelAPY[]) {
    let labels: string[] = []
    let data: number[] = []

    channels?.forEach(({ account, apy_total }) => {
      const total = Number(apy_total.substring(0, apy_total.length - 1))

      if (total) {
        labels.push(truncateValue(account, 5))
        data.push(Number(apy_total.substring(0, apy_total.length - 1)))
      }
    })

    const el: ChartItem | null = document.getElementById('apyByAccountChart') as ChartItem

    if (el) {
      new Chart(el, {
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

  // @TODO handle node with accounts that have not routed any value, have no fees - or APY
  onMount(() => {
    const channels = channelsAPY$.value.data?.filter((item) => item.account !== 'net')

    if (channels) {
      renderRoutingFeesByAccountChart(channels)
      renderApyByAccountChart(channels)
    }
  })

  onDestroy(() => {})
</script>

<section class="p-6 max-w-md">
  <h1 class="text-4xl mb-6 font-bold">{$translate('app.headings.account_insights')}</h1>
  <p>{$translate('app.subheadings.account_insights')}</p>
  <section class="mt-6 w-full flex justify-between flex-wrap gap-6">
    {#each charts as { title, id }}
      <div class="flex flex-col flex-wrap">
        <h3 class="text-sm text-neutral-400">{title}</h3>
        <canvas height="auto" width="auto" class="block" {id} />
      </div>
    {/each}
  </section>
</section>
