<script lang="ts">
  import { convertValue } from '$lib/conversion'
  import { BitcoinDenomination } from '$lib/types'
  import { truncateValue, userAgent } from '$lib/utils'
  import { onDestroy } from 'svelte'
  import { incomeEvents$, settings$ } from '$lib/streams'
  import { translate } from '$lib/i18n/translations'
  import type { Chart } from 'chart.js'
  import Spinner from '$lib/elements/Spinner.svelte'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'
  import info from '$lib/icons/info'
  import Button from '$lib/elements/Button.svelte'
  import Toggle from '$lib/elements/Toggle.svelte'
  import type { IncomeEvent } from '$lib/backends'
  import Dropdown from '$lib/components/Dropdown.svelte'
  import Pagination from '$lib/components/Pagination.svelte'
  import Slider from '$lib/components/Slider.svelte'

  // Mapping of date -> (account -> total routed on that date) & total routed for all channels on that date
  type DateData = Record<string, Record<string, string>>
  // List of account routing fees sorted by date
  type SortedDateData = Record<string, string>[]

  const device = userAgent!.getDevice()
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
  const itemsPerPage = 10 // channel pagination in dropdown
  let currentPage = 1 // channel pagination in dropdown
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
        [account]: updatedAccountTotal.toString(), // Fees for channel for given date
        total: updatedTotal.toString() // Total fees for the given date
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
    updateChartDatasets()
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
          borderColor: colors[i % colors.length]
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

  async function renderChart() {
    const { Chart } = await import('chart.js/auto')

    const ticksColor = $settings$.darkmode ? 'white' : 'black'

    if (chartEl) {
      chart = new Chart(chartEl, {
        type: 'line',
        data: {
          labels: [],
          datasets: []
        },
        options: {
          ...(device.type === 'mobile' && { aspectRatio: 1.1 }), // make chart more readible on mobile
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

  $: if (!noRoutingFees && chartEl) {
    renderChart()
  }

  // Initialize chart dates/data & update when chartRange is updated via slider
  $: if (chart && chartRange) {
    chartDatesSliced = chartDates.slice(chartRange.start, chartRange.end)
    chart.data.labels = chartDatesSliced
    updateChartDatasets()
  }

  onDestroy(() => {
    chart && chart.destroy()
  })
  // @TODO
  // change background color of slider
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
          <Dropdown label={$translate('app.labels.channels')}>
            <div class="p-4">
              <div class="flex flex-wrap gap-2 w-56" class:h-56={[...channelIDs].length > 10}>
                {#each [...channelIDs].slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage) as channelID}
                  <div>
                    <Toggle
                      handleChange={() => {
                        toggleActiveChannel(channelID)
                      }}
                      toggled={activeChannelIDs.includes(channelID)}
                      label={truncateValue(channelID, 3)}
                    />
                  </div>
                {/each}
              </div>

              {#if [...channelIDs].length > 10}
                <Pagination items={[...channelIDs]} bind:currentPage {itemsPerPage} />
              {/if}
            </div>
          </Dropdown>
        </div>
        <canvas bind:this={chartEl} />
        <p class="mb-4">{$translate('app.labels.date_range')}</p>
        <Slider
          totalItems={chartDates?.length}
          bind:start={chartRange.start}
          bind:end={chartRange.end}
          on:updateRange={(e) => (chartRange = e.detail)}
        />
      {/if}
    </section>
  {/if}
</section>
