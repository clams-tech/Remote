<script lang="ts">
  import type { Forward } from '$lib/@types/forwards.js'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import { formatDate } from '$lib/dates.js'
  import { db } from '$lib/db/index.js'
  import { translate } from '$lib/i18n/translations.js'
  import arrow from '$lib/icons/arrow.js'
  import caret from '$lib/icons/caret.js'
  import channels from '$lib/icons/channels.js'
  import { truncateValue } from '$lib/utils.js'
  import { liveQuery } from 'dexie'
  import { from } from 'rxjs'

  export let forward: Forward

  let formattedTimestamp: string

  formatDate(forward.timestamp, 'do MMM hh:mma').then(result => (formattedTimestamp = result))

  const data$ = from(
    liveQuery(() =>
      db.transaction('r', db.channels, db.wallets, async () => {
        const [wallet, channelIn, channelOut] = await Promise.all([
          db.wallets.get(forward.walletId),
          db.channels.where({ shortId: forward.shortIdIn }).first(),
          db.channels.where({ shortId: forward.shortIdOut }).first()
        ])

        return {
          wallet,
          channelInAlias:
            wallet?.nodeId === channelIn?.peerId
              ? (await db.wallets.get(channelIn!.walletId))?.label
              : channelIn?.peerAlias || (channelIn?.peerId && truncateValue(channelIn?.peerId)),
          channelOutAlias:
            wallet?.nodeId === channelOut?.peerId
              ? (await db.wallets.get(channelOut!.walletId))?.label
              : channelOut?.peerAlias || (channelOut?.peerId && truncateValue(channelOut?.peerId))
        }
      })
    )
  )
</script>

<a
  href={`/forwards/${forward.id}`}
  class="w-full flex items-center justify-between no-underline hover:bg-neutral-800/80 bg-neutral-900 transition-all py-4 pr-2 pl-4 rounded"
>
  {#if $data$}
    <div class="flex flex-col items-center max-w-[70%]">
      <div class="flex items-center text-sm gap-x-2 overflow-hidden w-full">
        <div class="flex items-center w-[40%]">
          <div class="w-6 text-utility-success rotate-180 flex-shrink-0">{@html arrow}</div>
          <div class="truncate uppercase">
            {($data$.channelInAlias || $translate('app.labels.unknown')).toUpperCase()}
          </div>
        </div>

        <div class="w-6 flex-shrink-0">{@html channels}</div>

        <div class="flex items-center w-[40%]">
          <div class="truncate uppercase">
            {($data$.channelOutAlias || $translate('app.labels.unknown')).toUpperCase()}
          </div>
          <div class="w-6 text-utility-error flex-shrink-0">{@html arrow}</div>
        </div>
      </div>

      <div class="font-semibold text-purple-100 bg-neutral-800 rounded-full px-2 w-min text-sm">
        {$data$.wallet?.label?.toUpperCase()}
      </div>

      {#if formattedTimestamp}
        <div class="text-xs font-semibold mt-1 ml-2">{formattedTimestamp}</div>
      {/if}
    </div>

    <div class="flex items-center h-full">
      <div class="flex flex-col items-end">
        <div class="w-full flex justify-end -mb-1 text-xs">{$translate('app.labels.fee')}:</div>
        <BitcoinAmount sats={forward.fee} short />
        <div class="w-full flex justify-end text-xs">
          <div
            class="font-semibold"
            class:text-utility-success={forward.status === 'settled'}
            class:utility-pending={forward.status === 'offered'}
            class:text-utility-error={forward.status === 'failed' ||
              forward.status === 'local_failed'}
          >
            {$translate(`app.labels.${forward.status}`)}
          </div>
        </div>
      </div>
      <div class="w-6 -rotate-90 -mr-1 ml-1">{@html caret}</div>
    </div>
  {/if}
</a>
