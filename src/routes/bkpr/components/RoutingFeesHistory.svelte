<script lang="ts">
  import { convertValue } from '$lib/conversion'
  import { BitcoinDenomination } from '$lib/types'
  import { generateColor, truncateValue } from '$lib/utils'
  import { onDestroy } from 'svelte'
  import { incomeEvents$, settings$ } from '$lib/streams'
  import { translate } from '$lib/i18n/translations'
  import type { Chart, ChartItem } from 'chart.js'
  import Spinner from '$lib/elements/Spinner.svelte'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'
  import info from '$lib/icons/info'
  import Button from '$lib/elements/Button.svelte'

  const colorCache: { [key: string]: string } = {}
  const chartId = 'feesHistory'
  type TimeFrame = 'all' | 'year' | 'biannual' | 'quarter' | 'month' | 'week'
  const timeFrames: TimeFrame[] = ['all', 'year', 'biannual', 'quarter', 'month', 'week']
  let noRoutingFees = false
  let firstRoutingEventTimestamp: number
  let activeChannelID: string | null = null
  let activeTimeFrame: TimeFrame = 'week'

  let chart: Chart<'line', number[], string>

  function getChannelColor(id: string, darkmode = false) {
    if (colorCache[id]) {
      return colorCache[id]
    }

    const color = generateColor(id, darkmode)
    colorCache[id] = color

    return color
  }

  function sumArrays(arrays: number[][]): number[] {
    const length = arrays[0]?.length

    const result = new Array(length).fill(0) // create an array with the same length, initialized with zeros
    for (let i = 0; i < length; i++) {
      for (let j = 0; j < arrays.length; j++) {
        result[i] += arrays[j][i]
      }
    }
    return result
  }

  function* generateDates(startDate: Date, endDate: Date) {
    const current = new Date(startDate)
    while (current <= endDate) {
      yield current.toDateString()
      current.setDate(current.getDate() + 1)
    }
  }

  // X-axis labels for chart for given timeframe
  function xAxisDates(timeframe: TimeFrame) {
    const today = new Date()
    let startDate

    // Calculate the start date based on the specified timeframe
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
      case 'biannual':
        startDate = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate())
        break
      case 'year':
        startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
        break
      case 'all':
        startDate = new Date(routingEvents[0].timestamp * 1000) // First routing event
        break
      default:
        startDate = new Date()
    }
    // Each date between a given starting date and today
    const dates = Array.from(generateDates(startDate, today))
    return dates
  }

  $: routingEvents = ($incomeEvents$.data || []).filter(
    (event) => event.tag === 'routed' && event.credit_msat > 0
  )

  $: channelIDs = new Set(routingEvents?.map((event) => event.account))

  $: dates = xAxisDates(activeTimeFrame)

  // Update chart if routing events exist or time frame is switched
  $: if (routingEvents.length || activeTimeFrame) {
    firstRoutingEventTimestamp = routingEvents[0]?.timestamp * 1000
    updateChart()
    // Hide chart & show no fees message
  } else {
    noRoutingFees = true
  }

  function getChannelData(channelID: string, dayData: { x: string; y: number }[] = []) {
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

  function updateChartData(channelID?: string) {
    chart.data.datasets = []

    let dayData = dates.map((date) => ({
      x: date,
      y: 0
    }))

    // Add fee data for single channel
    if (channelID) {
      activeChannelID = channelID

      const data = getChannelData(channelID, dayData)

      chart.data.datasets.push({
        label: truncateValue(channelID, 3),
        data,
        borderColor: getChannelColor(channelID),
        fill: false
      })

      chart.update()
      // Add fee data for all channels
    } else {
      activeChannelID = ''

      const totalData: number[][] = []

      for (const channelID of channelIDs) {
        const channelData = getChannelData(channelID, dayData)

        totalData.push(channelData)
      }

      const data = sumArrays(totalData)

      chart.data.datasets.push({
        label: $translate('app.buttons.total'),
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
    const ticksColor = $settings$.darkmode ? 'white' : 'black'

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
            ticks: {
              color: ticksColor
            },
            title: {
              color: ticksColor,
              display: true,
              text: 'DATE'
            }
          },
          y: {
            display: true,
            beginAtZero: true,
            ticks: {
              color: ticksColor
            },
            title: {
              color: ticksColor,
              display: true,
              text: $settings$.bitcoinDenomination.toLocaleUpperCase()
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
    {$translate('app.headings.routing_fees_history')}
  </h1>
  <p>
    {$translate('app.subheadings.routing_fees_history')}
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
        <div class="mb-6 flex gap-4">
          <Button
            primary={!activeChannelID}
            small={true}
            on:click={() => updateChartData()}
            text={$translate('app.buttons.total')}
          />
          {#each [...channelIDs] as channelID}
            <Button
              primary={activeChannelID === channelID}
              small={true}
              on:click={() => updateChartData(channelID)}
              text={truncateValue(channelID, 3)}
            />
          {/each}
        </div>

        <canvas id={chartId} />

        <div class="mt-6 flex gap-4 flex-wrap w-full justify-between">
          {#each timeFrames as tf}
            <div>
              <Button
                primary={activeTimeFrame === tf}
                small={true}
                on:click={() => (activeTimeFrame = tf)}
                text={tf}
              />
            </div>
          {/each}
        </div>
      {/if}
    </section>
  {/if}
</section>
