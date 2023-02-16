<script lang="ts">
  import { convertValue } from '$lib/conversion'
  import { BitcoinDenomination } from '$lib/types'
  import { truncateValue } from '$lib/utils'
  import Chart, { type ChartItem } from 'chart.js/auto'
  import { onDestroy, onMount } from 'svelte'
  import { channelsAPY$ } from '$lib/streams'
  import { translate } from '$lib/i18n/translations'

  const charts = [
    {
      id: 'routingFeesByAccountChart'
    },
    {
      id: 'apyByAccountChart'
    }
  ]
  let routingFeesByAccountChart
  let apyByAccountChart

  function routingFeesByAccount() {
    let labels: string[] = []
    let data: number[] = []

    channelsAPY$.value.data?.forEach(({ account, fees_in_msat, fees_out_msat }) => {
      if (account !== 'net') {
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

          labels.push(truncateValue(account))
          data.push(value)
        }
      }
    })

    const el: ChartItem | null = document.getElementById('routingFeesByAccountChart') as ChartItem

    if (el) {
      routingFeesByAccountChart = new Chart(el, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Routing fees by account (sats)',
              data
            }
          ]
        }
      })
    }
  }

  function apyByAccount() {
    let labels: string[] = []
    let data: number[] = []

    channelsAPY$.value.data?.forEach(({ account, apy_total }) => {
      if (account !== 'net') {
        const total = Number(apy_total.substring(0, apy_total.length - 1))

        if (total) {
          labels.push(truncateValue(account))
          data.push(Number(apy_total.substring(0, apy_total.length - 1)))
        }
      }
    })

    const el: ChartItem | null = document.getElementById('apyByAccountChart') as ChartItem

    if (el) {
      apyByAccountChart = new Chart(el, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'APY by account (%)',
              data
            }
          ]
        }
      })
    }
  }

  // @TODO handle node with accounts that have not routed any value, have no fees - or APY
  onMount(() => {
    routingFeesByAccount()
    apyByAccount()
  })

  onDestroy(() => {})
</script>

<section class="p-6">
  <h1 class="text-4xl mb-6 font-bold">{$translate('app.headings.account_insights')}</h1>
  <p>{$translate('app.subheadings.account_insights')}</p>
  <section class="mt-6 w-full flex justify-between flex-wrap gap-6">
    {#each charts as { id }}
      <div class="flex flex-1 flex-wrap relative h-56">
        <canvas height="auto" width="auto" class="block" {id} />
      </div>
    {/each}
  </section>
</section>
