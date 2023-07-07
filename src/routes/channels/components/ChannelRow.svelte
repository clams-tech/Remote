<script lang="ts">
  import { currencySymbols } from '$lib/constants.js'
  import { convertValue } from '$lib/conversion.js'
  import { translate } from '$lib/i18n/translations.js'
  import { settings$ } from '$lib/streams.js'
  import { BitcoinDenomination, type Channel } from '$lib/types.js'
  import { formatValueForDisplay, truncateValue } from '$lib/utils.js'
  import Big from 'big.js'
  import { channelStatusTolabel } from '../utils.js'

  export let channel: Channel

  const { peerAlias, peerId, balanceRemote, balanceLocal, status } = channel
  const balanceTotal = Big(balanceLocal).plus(balanceRemote)
  const localPercent = Big(balanceLocal).div(balanceTotal).times(100).toNumber()
  const remotePercent = Big(balanceRemote).div(balanceTotal).times(100).toNumber()

  const channelStatusLabel = channelStatusTolabel(status)

  $: primarySymbol = currencySymbols[$settings$.primaryDenomination]
</script>

<a href="/channels/{channel.id}" class="w-full py-2 border-b border-neutral-400 block">
  <div class="flex items-center justify-between mb-1 px-[1px]">
    <div class="text-sm font-semibold">{peerAlias || truncateValue(peerId, 6)}</div>
    <div
      class:text-utility-success={channelStatusLabel === 'active'}
      class:text-utility-pending={channelStatusLabel === 'pending'}
      class:text-utility-error={channelStatusLabel === 'closing' || channelStatusLabel === 'closed'}
      class="text-xs flex items-center"
    >
      <div class="bg-current w-2 h-2 rounded-full mr-1" />
      <div>
        {$translate(`app.labels.${channelStatusLabel}`)}
      </div>
    </div>
  </div>

  <div class="flex items-center gap-x-1">
    <div style="width: {localPercent}%;" class="h-2 rounded-full bg-purple-500" />
    <div style="width: {remotePercent}%;" class="h-2 rounded-full bg-purple-200" />
  </div>

  <div class="w-full flex items-center justify-between text-sm mt-1 px-[1px]">
    <div class="flex items-center">
      <span
        class="flex justify-center items-center"
        class:w-4={primarySymbol.startsWith('<')}
        class:mr-[2px]={!primarySymbol.startsWith('<')}>{@html primarySymbol}</span
      >
      {formatValueForDisplay({
        value: convertValue({
          value: balanceLocal,
          from: BitcoinDenomination.msats,
          to: $settings$.primaryDenomination
        }),
        denomination: $settings$.primaryDenomination,
        commas: true
      })}
    </div>

    <div class="flex items-center">
      <span
        class="flex justify-center items-center"
        class:w-4={primarySymbol.startsWith('<')}
        class:mr-[2px]={!primarySymbol.startsWith('<')}>{@html primarySymbol}</span
      >
      {formatValueForDisplay({
        value: convertValue({
          value: balanceRemote,
          from: BitcoinDenomination.msats,
          to: $settings$.primaryDenomination
        }),
        denomination: $settings$.primaryDenomination,
        commas: true
      })}
    </div>
  </div>
</a>
