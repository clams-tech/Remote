<script lang="ts">
  import { convertValue } from '$lib/conversion'
  import { BitcoinDenomination } from '$lib/types'
  import { formatValueForDisplay } from '$lib/utils'
  import { channelsAPY$, settings$ } from '$lib/streams'
  import { translate } from '$lib/i18n/translations'

  $: net = channelsAPY$.value.data?.filter((item) => item.account === 'net')[0]

  // Format value or fees
  function formatValue(value: number) {
    return formatValueForDisplay({
      value: convertValue({
        value: value.toString(),
        from: BitcoinDenomination.msats,
        to: $settings$.bitcoinDenomination
      }),
      denomination: $settings$.bitcoinDenomination,
      commas: true
    })
  }

  function formatAPY(apy: string) {
    // Three decimals minus trailing zeros
    return parseFloat(Number(apy.slice(0, -1)).toFixed(3))
  }
</script>

{#if net}
  <section class="p-6 border rounded-md">
    <h1 class="text-4xl w-full mb-6 font-bold">{$translate('app.headings.routing_performance')}</h1>
    <p>{$translate('app.subheadings.routing_performance')}</p>
    <div class="mt-6 rounded-lg shadow-lg border">
      <table class="w-full">
        <thead>
          <tr class="text-left uppercase">
            <th class="px-2 py-2" />
            <th class="px-2 py-2"
              >{$translate('app.labels.value')} ({$settings$.bitcoinDenomination})</th
            >
            <th class="px-2 py-2"
              >{$translate('app.labels.fees')} ({$settings$.bitcoinDenomination})</th
            >

            <th class="px-2 py-2">{$translate('app.labels.apy')} (%)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="px-2 py-2 font-semibold uppercase border-t border-b"
              >{$translate('app.labels.in')}</td
            >
            <!-- Value -->
            <td class="px-2 py-2 border"> {formatValue(net.routed_in_msat)}</td>
            <!-- Fees -->
            <td class="px-2 py-2 border"> {formatValue(net.fees_in_msat)}</td>
            <!-- APY -->
            <td class="px-2 py-2 border-t">{formatAPY(net.apy_in)}</td>
          </tr>
          <tr>
            <td class="px-2 py-2 font-semibold uppercase border-t border-b"
              >{$translate('app.labels.out')}</td
            >
            <!-- Value -->
            <td class="px-2 py-2 border"> {formatValue(net.routed_out_msat)}</td>
            <!-- Fees -->
            <td class="px-2 py-2 border"> {formatValue(net.fees_out_msat)}</td>
            <!-- APY -->
            <td class="px-2 py-2 border-t">{formatAPY(net.apy_out)}</td>
          </tr>
          <tr>
            <td class="px-2 py-2 font-semibold uppercase border-t"
              >{$translate('app.labels.total')}</td
            >
            <!-- Value -->
            <td class="px-2 py-2 border-l border-r">
              {formatValue(net.routed_in_msat + net.routed_out_msat)}</td
            >
            <!-- Fees -->
            <td class="px-2 py-2 border-l border-r">
              {formatValue(net.fees_in_msat + net.fees_out_msat)}</td
            >
            <!-- APY -->
            <td class="px-2 py-2 border-t">{formatAPY(net.apy_total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
{/if}
