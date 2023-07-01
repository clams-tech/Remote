<script lang="ts">
  import { currencySymbols } from '$lib/constants.js'
  import { convertValue } from '$lib/conversion.js'
  import { translate } from '$lib/i18n/translations.js'
  import { settings$ } from '$lib/streams.js'
  import { BitcoinDenomination, type Channel, type ChannelStatus } from '$lib/types.js'
  import { formatValueForDisplay } from '$lib/utils.js'
  import Big from 'big.js'

  export let channel: Channel

  const { peerAlias, balanceTotal, balanceRemote, balanceLocal, status } = channel
  const localPercent = Big(balanceLocal).div(balanceTotal).times(100).toNumber()
  const remotePercent = Big(balanceRemote).div(balanceTotal).times(100).toNumber()

  const channelStatusTolabel = (status: ChannelStatus) => {
    switch (status) {
      case 'CHANNEL_NORMAL':
        return $translate('app.labels.active')
      case 'CHANNEL_AWAITING_LOCKIN':
      case 'OPENING':
      case 'DUALOPEN_AWAITING_LOCKIN':
      case 'DUALOPEN_OPEN_INIT':
      case 'FUNDING_SPEND_SEEN':
      case 'ONCHAIN':
        return $translate('app.labels.pending')
      case 'AWAITING_UNILATERAL':
      case 'CHANNEL_SHUTTING_DOWN':
      case 'CLOSING_SIGEXCHANGE':
        return $translate('app.labels.closing')
      default:
        return $translate('app.labels.closed')
    }
  }

  const channelStatusLabel = channelStatusTolabel(status)

  $: primarySymbol = currencySymbols[$settings$.primaryDenomination]
</script>

<div class="w-full py-2 border-y border-neutral-400">
  <div class="flex items-center justify-between mb-1 px-[1px]">
    <div class="text-sm font-semibold">{peerAlias}</div>
    <div
      class:text-utility-success={channelStatusLabel === $translate('app.labels.active')}
      class:text-utility-pending={channelStatusLabel === $translate('app.labels.pending')}
      class:text-utility-error={channelStatusLabel === $translate('app.labels.closing') ||
        channelStatusLabel === $translate('app.labels.closed')}
      class="text-xs flex items-center"
    >
      <div class="bg-current w-2 h-2 rounded-full mr-1" />
      <div>
        {channelStatusLabel}
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
</div>
