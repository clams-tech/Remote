<script lang="ts">
  import { translate } from '$lib/i18n/translations.js'
  import { truncateValue } from '$lib/utils.js'
  import Big from 'big.js'
  import { channelStatusTolabel } from '../utils.js'
  import type { Channel } from '$lib/@types/channels.js'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import { connectionsDetails$ } from '$lib/streams.js'

  export let channel: Channel

  $: balanceTotal = Big(channel.balanceLocal).plus(channel.balanceRemote)
  $: localPercent = Big(channel.balanceLocal).div(balanceTotal).times(100).toNumber()
  $: remotePercent = Big(channel.balanceRemote).div(balanceTotal).times(100).toNumber()

  const channelStatusLabel = channelStatusTolabel(channel.status)

  $: connectionDetails = $connectionsDetails$?.find((conn) => conn.id === channel.connectionId)
</script>

<a
  href="/channels/{channel.id}"
  class="w-full pb-3 pt-2.5 border-b border-neutral-400 block no-underline hover:bg-neutral-800 transition-all"
>
  <div class="flex items-center gap-x-2">
    <div class="font-semibold whitespace-nowrap">
      {connectionDetails?.label.toUpperCase()}
    </div>

    <div class:gap-x-1={localPercent && remotePercent} class="flex items-center w-full">
      <div style="width: {localPercent}%;" class="h-3 rounded-full bg-purple-400 shadow" />
      <div style="width: {remotePercent}%;" class="h-3 rounded-full bg-purple-100 shadow" />
    </div>

    <div class="font-semibold whitespace-nowrap">
      {(channel.peerAlias || truncateValue(channel.peerId, 6)).toUpperCase()}
    </div>
  </div>

  <div class="w-full flex items-end text-sm gap-x-4">
    <div class="flex flex-col items-baseline">
      <div class="flex items-center font-semibold">
        <BitcoinAmount msat={channel.balanceLocal} />
      </div>
      <div class="text-xs text-neutral-300 mt-0.5">
        {$translate('app.labels.local')}
      </div>
    </div>

    <div
      class:text-utility-success={channelStatusLabel === 'active'}
      class:text-utility-pending={channelStatusLabel === 'pending'}
      class:text-utility-error={channelStatusLabel === 'closing' || channelStatusLabel === 'closed'}
      class="text-sm flex items-center justify-center w-full leading-4"
    >
      <div class="bg-current w-2.5 h-2.5 rounded-full mr-1" />
      <div>
        {$translate(`app.labels.${channelStatusLabel}`)}
      </div>
    </div>

    <div class="flex flex-col items-end">
      <div class="flex items-center font-semibold">
        <BitcoinAmount msat={channel.balanceRemote} />
      </div>
      <div class="text-xs text-neutral-300 mt-0.5">
        {$translate('app.labels.remote')}
      </div>
    </div>
  </div>
</a>
