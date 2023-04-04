<script lang="ts">
  import { convertValue } from '$lib/conversion'
  import { BitcoinDenomination } from '$lib/types'
  import { truncateValue } from '$lib/utils'
  import { onDestroy } from 'svelte'
  import { incomeEvents$, settings$ } from '$lib/streams'
  import { translate } from '$lib/i18n/translations'
  import type { Chart } from 'chart.js'
  import Spinner from '$lib/elements/Spinner.svelte'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'
  import info from '$lib/icons/info'
  import Button from '$lib/elements/Button.svelte'
  import type { IncomeEvent } from '$lib/backends'
  import noUiSlider, { type API, type target } from 'nouislider'
  import 'nouislider/dist/nouislider.css'

  const colors = [
    '#FF4136', // Red
    '#2ECC40', // Green
    '#0074D9', // Blue
    '#FF851B', // Orange
    '#B10DC9', // Purple
    '#FFDC00', // Yellow
    '#7FDBFF', // Light blue
    '#F012BE', // Magenta
    '#01FF70', // Lime green
    '#E6DB74' // Light yellow
  ]
  let slider: target | HTMLDivElement
  let sliderInstance: API
  let noRoutingFees = false
  let activeChannelIDs: string[] = []
  let chartEl: string | HTMLCanvasElement
  let chart: Chart<'line', number[], string>
  let endDate = new Date() // Slider defaults to today
  let chartDatesFiltered: string[]

  // Mapping of date -> (account -> total routed on that date)
  type DateData = Record<string, Record<string, string>>
  // List of account routing fees sorted by date
  type SortedDateData = Record<string, string>[]

  function formatRoutesByDate(events: IncomeEvent[]): SortedDateData {
    const dateMap = events.reduce((acc, { timestamp, credit_msat, account }) => {
      const dateString = new Date(timestamp * 1000).toDateString()
      const currentVal = acc[dateString] || { total: '0' }
      const currentAccountTotal = currentVal[account] || '0'
      const updatedAccountTotal = BigInt(currentAccountTotal) + BigInt(credit_msat)
      const updatedTotal = BigInt(currentVal.total) + BigInt(credit_msat)

      acc[dateString] = {
        ...currentVal,
        [account]: updatedAccountTotal.toString(),
        total: updatedTotal.toString()
      }

      return acc
    }, {} as DateData)

    return (
      Object.keys(dateMap)
        // sort the date keys
        .sort((a, b) => new Date(b).getMilliseconds() - new Date(a).getMilliseconds())
        .map((date) => ({ date, ...dateMap[date] }))
    )
  }

  // X-axis labels for chart for given timeframe
  function xAxisDates(startDate: Date, endDate: Date) {
    function* generateDates(startDate: Date, endDate: Date) {
      const current = new Date(startDate)
      while (current <= endDate) {
        yield current.toDateString()
        current.setDate(current.getDate() + 1)
      }
    }
    // Each date between a given start & end date
    const dates = Array.from(generateDates(startDate, endDate))
    return dates
  }

  $: routingEvents = ($incomeEvents$.data || []).filter(
    (event) => event.tag === 'routed' && event.credit_msat > 0
  )
  $: noRoutingFees = !routingEvents.length
  $: routingDates = formatRoutesByDate(routingEvents)
  $: channelIDs = new Set(routingEvents?.map((event) => event.account))
  $: startDate = new Date(routingEvents[0]?.timestamp * 1000)
  $: chartDates = xAxisDates(startDate, endDate)

  // Initialize filtered dates
  $: if (chartDates) {
    chartDatesFiltered = chartDates
  }

  // Update chart data on initial redner & when activeChannelIDs or chartDatesFiltered changes
  $: if (chart && activeChannelIDs && chartDatesFiltered) {
    updateChartData()
  }

  function getChannelData(dayData: { x: string; y: number }[], channelID?: string) {
    for (const routingDate of routingDates) {
      for (const day of dayData) {
        if (routingDate.date === day.x && (!channelID || routingDate[channelID])) {
          const value = channelID ? routingDate[channelID] : routingDate.total
          day.y = parseInt(
            convertValue({
              value,
              from: BitcoinDenomination.msats,
              to: $settings$.bitcoinDenomination
            }) as string
          )
        }
      }
    }

    return dayData.map((day) => day.y)
  }

  function toggleChannelData(channelID: string) {
    if (activeChannelIDs.includes(channelID)) {
      activeChannelIDs = activeChannelIDs.filter((id) => id !== channelID)
    } else {
      activeChannelIDs = [...activeChannelIDs, channelID]
    }
  }

  function updateChartData() {
    chart.data.datasets = []
    const dayData = Array.from(chartDatesFiltered, (date) => ({ x: date, y: 0 }))
    // A line for each selected channel on the chart
    if (activeChannelIDs.length) {
      activeChannelIDs.forEach((channelID, i) => {
        const data = getChannelData(dayData, channelID)

        chart.data.datasets.push({
          label: truncateValue(channelID, 3),
          data,
          fill: false,
          borderColor: colors[i]
        })
      })
      // A single line for total fees
    } else {
      const data = getChannelData(dayData)

      chart.data.datasets.push({
        label: 'Total',
        data,
        fill: false
      })
    }

    chart.update()
  }

  async function renderChart() {
    const { Chart } = await import('chart.js/auto')

    const ticksColor = $settings$.darkmode ? 'white' : 'black'

    chart = new Chart(chartEl, {
      type: 'line',
      data: {
        labels: chartDates,
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
  }

  function renderSlider() {
    if (slider) {
      sliderInstance = noUiSlider.create(slider, {
        start: [0, chartDates.length],
        connect: true,
        step: 1,
        range: {
          min: 0,
          max: chartDates.length
        }
      })
      // Update date range on chart (and data) when slider is updated
      sliderInstance.on('change', (event) => {
        chartDatesFiltered = chartDates.slice(Number(event[0]), Number(event[1]))
        chart.data.labels = chartDatesFiltered
      })
    }
  }

  $: if (chartEl && !noRoutingFees && chartDatesFiltered.length) {
    renderChart()
  }

  $: if (slider) {
    renderSlider()
  }

  onDestroy(() => {
    chart && chart.destroy()
    sliderInstance && sliderInstance.destroy()
  })

  // @TODO
  // chartjs determine how to render lines on top of eachother in a clear way
  // add dropdown component with checkboxes to handle toggle of large number of channels
  // improve mobile styles
  // change background color of slider
  // choose 10 colors for lines that work on light & dark mode
  // fix bug in counting where feb 9th has 14 + 14 values for 2 channels - but total is 28
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
            small={true}
            primary={!activeChannelIDs.length}
            on:click={() => {
              activeChannelIDs = []
            }}
            text={$translate('app.buttons.total')}
          />
          {#each [...channelIDs] as channelID}
            <Button
              small={true}
              primary={activeChannelIDs.includes(channelID)}
              on:click={() => {
                toggleChannelData(channelID)
              }}
              text={truncateValue(channelID, 3)}
            />
          {/each}
        </div>

        <canvas bind:this={chartEl} />

        <p class="mb-4">{$translate('app.labels.date_range')}</p>
        <div class="mr-4 mb-4 ml-4 w-full">
          <div bind:this={slider} />
        </div>
      {/if}
    </section>
  {/if}
</section>
