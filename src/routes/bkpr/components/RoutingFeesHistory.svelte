<script lang="ts">
  import { convertValue } from '$lib/conversion'
  import { BitcoinDenomination } from '$lib/types'
  import { truncateValue } from '$lib/utils'
  import { onDestroy } from 'svelte'
  import { incomeEvents$, channelsAPY$, settings$ } from '$lib/streams'
  import { translate } from '$lib/i18n/translations'
  import type { Chart, ChartItem } from 'chart.js'
  import Spinner from '$lib/elements/Spinner.svelte'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'
  import info from '$lib/icons/info'

  let noRoutingFees = false
  const timeFrames = ['all', 'year', '6months', 'quarter', 'month', 'week']
  let timeFrame = 'week'
  const chartId = 'feesHistory'
  let chart: Chart<'line', number[], string>

  function getChannelColor(id: string, darkmode = $settings$.darkmode) {
    const letters = '0123456789ABCDEF'
    let hash = 0
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash)
    }
    let color = '#'
    for (let i = 0; i < 3; i++) {
      let value = (hash >> (i * 8)) & 0xff
      if (darkmode) {
        value = Math.min(value + 30, 255) // make dark mode colors lighter
      }
      let hex = letters[value % 16]
      hex += letters[Math.floor(value / 16)]
      color += hex
    }
    // add alpha channel for readability
    return `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(
      color.slice(5, 7),
      16
    )}, ${darkmode ? 0.5 : 1})`
  }

  function sumArrays(arrays: number[][]): number[] {
    const length = arrays[0].length

    const result = new Array(length).fill(0) // create an array with the same length, initialized with zeros
    for (let i = 0; i < length; i++) {
      for (let j = 0; j < arrays.length; j++) {
        result[i] += arrays[j][i]
      }
    }
    return result
  }

  function xAxisDates(timeframe: string) {
    const today = new Date()
    let startDate

    switch (timeframe) {
      case 'week':
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)
        break
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
        break
      case 'quarter':
        startDate = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())
        break
      case '6months':
        startDate = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate())
        break
      case 'year':
        startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
        break
      // @TODO add all time option which should start when first event occurs
      default:
        startDate = new Date()
    }

    const dates = []

    while (startDate <= today) {
      dates.push(startDate.toDateString())
      startDate.setDate(startDate.getDate() + 1)
    }

    return dates
  }

  $: routingEvents = ($incomeEvents$.data || []).filter(
    (event) => event.tag === 'routed' && event.credit_msat > 0
  )

  $: channelIDs = new Set(routingEvents.map((event) => event.account))

  $: if (routingEvents.length || timeFrame) {
    updateChart()
  } else {
    noRoutingFees = true
  }

  $: dates = xAxisDates(timeFrame)

  function getchannelData(channelID: string, dayData: { x: string; y: number }[] = []) {
    let accountRoutingEvents = routingEvents.filter((event) => event.account === channelID)

    for (const event of accountRoutingEvents) {
      for (const day of dayData) {
        if (new Date(event.timestamp * 1000).toDateString() === day.x) {
          day.y += parseInt(event.credit_msat as string)
        }
      }
    }

    return dayData.map((day) =>
      parseInt(
        convertValue({
          value: day.y.toString(),
          from: BitcoinDenomination.msats,
          to: $settings$.bitcoinDenomination
        }) as string
      )
    )
  }

  // TODO - style the chart better
  function updateChartData(channelID?: string) {
    chart.data.datasets = []

    // Add single channel data
    if (channelID) {
      let dayData = dates.map((date) => ({
        x: date,
        y: 0
      }))

      const data = getchannelData(channelID, dayData)

      chart.data.datasets.push({
        label: truncateValue(channelID, 3),
        data,
        // TOTDO - add color the pie charts the same colors
        borderColor: getChannelColor(channelID),
        fill: false
      })

      chart.update()
      // Add total data for all channels
    } else {
      const totalData: number[][] = []

      for (const channelID of channelIDs) {
        let dayData = dates.map((date) => ({
          x: date,
          y: 0
        }))

        const channelData = getchannelData(channelID, dayData)

        totalData.push(channelData)
      }

      const data = sumArrays(totalData)

      chart.data.datasets.push({
        label: 'Total',
        data
      })

      chart.update()
    }
  }

  async function updateChart() {
    const { Chart } = await import('chart.js/auto')

    if (chart) {
      chart.destroy()
    }
    // Create new chart
    const el = document.getElementById(chartId) as ChartItem

    chart = new Chart(el, {
      type: 'line',
      data: {
        labels: dates,
        datasets: []
      },
      options: {
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Date'
            }
          },
          y: {
            beginAtZero: true,
            display: true,
            title: {
              display: true,
              text: $settings$.bitcoinDenomination
            }
          }
        }
      }
    })
    updateChartData()
  }

  onDestroy(() => {
    chart.destroy()
  })
</script>

<section
  class="p-4 border border-current rounded-md md:row-span-2 w-full shadow-sm shadow-purple-400"
>
  <h1 class="text-2xl mb-6 font-bold">
    <!-- TODO - translations -->
    <!-- {$translate('app.headings.account_insights')} -->
    Routing Fees History
  </h1>
  <p>
    <!-- {$translate('app.subheadings.account_insights')} -->
    Total vs per channel over time:
  </p>

  {#if $incomeEvents$.loading}
    <section class="w-full py-6 flex items-center justify-center">
      <Spinner />
    </section>
  {:else if $incomeEvents$.error}
    <div class="flex items-center justify-center">
      <ErrorMsg message={$incomeEvents$.error} closable={false} />
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
        <div class="flex">
          <button
            class="m-2 px-2 py-1 rounded-md border border-current"
            on:click={() => updateChartData()}>Total</button
          >
          <!-- TODO - add label to each button to show if its active or not -->
          {#each [...channelIDs] as channelID}
            <!-- TODO - style buttons -->
            <button
              class="m-2 px-2 py-1 rounded-md border border-current"
              on:click={() => updateChartData(channelID)}>{truncateValue(channelID, 3)}</button
            >
          {/each}
        </div>
        <canvas id={chartId} />

        <div class="flex justify-around w-full">
          {#each timeFrames as tf}
            <button
              class="mr-2 px-2 py-1 rounded-md border border-current"
              on:click={() => (timeFrame = tf)}
            >
              {tf}
            </button>
          {/each}
        </div>
      {/if}
    </section>
  {/if}
</section>
