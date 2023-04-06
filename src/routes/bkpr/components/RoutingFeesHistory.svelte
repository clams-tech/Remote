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

  // Mapping of date -> (account -> total routed on that date) & total routed for all channels on that date
  type DateData = Record<string, Record<string, string>>
  // List of account routing fees sorted by date
  type SortedDateData = Record<string, string>[]

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
  let chartRange = { start: 0, end: 0 } // Used to slice chartDates & chartData
  let chartDates: string[] = []
  let chartDatesSliced: string[] = []

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

  // Channel dropdown toggle
  function toggleActiveChannel(channelID: string) {
    if (activeChannelIDs.indexOf(channelID) === -1) {
      activeChannelIDs = [...activeChannelIDs, channelID]
    } else {
      activeChannelIDs = activeChannelIDs.filter((id) => id !== channelID)
    }
  }

  // Returns chart data for a given channel or data for total channels
  function getChartData(dayData: { x: string; y: number }[], channelID?: string) {
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

  // Generate chart data using chosen range of dates & channels
  function updateChartDatasets() {
    chart.data.datasets = []
    const dayData = Array.from(chartDatesSliced, (date) => ({ x: date, y: 0 }))
    // A line for each selected channel on the chart
    if (activeChannelIDs.length) {
      activeChannelIDs.forEach((channelID, i) => {
        const data = getChartData(dayData, channelID)

        chart.data.datasets.push({
          label: truncateValue(channelID, 3),
          data,
          fill: false,
          borderColor: colors[i]
        })
      })
      // A single line for total fees
    } else {
      const data = getChartData(dayData)

      chart.data.datasets.push({
        label: 'Total',
        data,
        fill: false
      })
    }

    chart.update()
  }

  $: routingEvents = ($incomeEvents$.data || []).filter(
    (event) => event.tag === 'routed' && Number(event.credit_msat) > 0
  )
  $: noRoutingFees = !routingEvents.length
  $: routingDates = formatRoutesByDate(routingEvents)
  $: channelIDs = new Set(routingEvents?.map((event) => event.account))

  // Generate chartDates & initalize chart range
  $: if (routingEvents.length) {
    chartDates = xAxisDates(
      new Date(routingEvents[0]?.timestamp * 1000), // First event date
      new Date(routingEvents[routingEvents.length - 1]?.timestamp * 1000) // Last event date
    )
    chartRange = { start: 0, end: chartDates.length }
  }

  // Initialize chart data & update chart data when channel is toggled in dropdown
  $: if (chart && activeChannelIDs) {
    updateChartDatasets()
  }

  // Update chart dates & data when chartRange is updated via slider
  $: if (chart && chartRange) {
    chartDatesSliced = chartDates.slice(chartRange.start, chartRange.end)
    chart.data.labels = chartDatesSliced
    updateChartDatasets()
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
      // Update range for x-axis dates & data on chart when slider is moved
      sliderInstance.on('change', (event) => {
        chartRange = { start: Number(event[0]), end: Number(event[1]) }
      })
    }
  }

  $: if (!noRoutingFees && chartEl && chartDates) {
    renderChart()
  }

  $: if (slider) {
    renderSlider()
  }

  onDestroy(() => {
    chart && chart.destroy()
    sliderInstance && sliderInstance.destroy()
  })

  let dropdownOpen = false

  // @TODO
  // chartjs determine how to render lines on top of eachother in a clear way
  // improve mobile styles
  // change background color of slider
  // choose 10 colors for lines that work on light & dark mode
  // Fix loop of chart colors to ensure that it can support more than 10 channels
  // Add fade effect to open/close of dropdown
  // Add toggle element to dropdown
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

          <!-- @TODO move to "Dropdown Element" -->
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            class="relative inline-block text-left"
            on:click={() => {
              dropdownOpen = !dropdownOpen
            }}
          >
            <div>
              <button
                type="button"
                class="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                id="menu-button"
                aria-expanded="true"
                aria-haspopup="true"
              >
                Channels
                <svg
                  class="-mr-1 h-5 w-5 text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fill-rule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <!--
              Dropdown menu, show/hide based on menu state.
          
              Entering: "transition ease-out duration-100"
                From: "transform opacity-0 scale-95"
                To: "transform opacity-100 scale-100"
              Leaving: "transition ease-in duration-75"
                From: "transform opacity-100 scale-100"
                To: "transform opacity-0 scale-95"
            -->
            {#if dropdownOpen}
              <div
                class="absolute left-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="menu-button"
                tabindex="-1"
              >
                <div class="py-1" role="none">
                  {#each [...channelIDs] as channelID}
                    <Button
                      small={true}
                      primary={activeChannelIDs.includes(channelID)}
                      on:click={() => {
                        toggleActiveChannel(channelID)
                      }}
                      text={truncateValue(channelID, 3)}
                    />
                  {/each}
                </div>
              </div>
            {/if}
          </div>
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
