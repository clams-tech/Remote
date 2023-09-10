<script lang="ts">
  import type { Forward } from '$lib/@types/forwards.js'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import { db } from '$lib/db.js'
  import { translate } from '$lib/i18n/translations.js'
  import arrow from '$lib/icons/arrow.js'
  import caret from '$lib/icons/caret.js'
  import channels from '$lib/icons/channels.js'
  import { truncateValue } from '$lib/utils.js'

  export let forward: Forward
</script>

<a
  href={`/forwards/${forward.id}`}
  class="w-full flex items-center no-underline hover:bg-neutral-800/80 bg-neutral-900 transition-all p-4 rounded"
>
  <div class="flex flex-grow items-center gap-x-2 justify-between">
    <div class="flex items-center">
      <div class="w-8 text-utility-success">{@html arrow}</div>
      <div class="font-semibold">
        {#await db.channels.where({ shortId: forward.shortIdIn }).first() then inChannel}
          {inChannel?.peerAlias ||
            truncateValue(inChannel?.peerId || $translate('app.labels.unknown'))}
        {/await}
      </div>
      <div class="w-8 ml-1">{@html channels}</div>
    </div>

    <div class="flex flex-col justify-center items-center">
      <div class="font-semibold">
        {#await db.wallets.get(forward.walletId) then wallet}
          {wallet?.label}
        {/await}
      </div>
      <div class="flex items-center">
        <span class="text-utility-success mr-1">+</span>
        <BitcoinAmount sats={forward.fee} short />
      </div>
    </div>

    <div class="flex items-center">
      <div class="w-8 mr-1">{@html channels}</div>
      <div class="font-semibold">
        {#await db.channels.where({ shortId: forward.shortIdOut }).first() then outChannel}
          {outChannel?.peerAlias ||
            truncateValue(outChannel?.peerId || $translate('app.labels.unknown'))}
        {/await}
      </div>
      <div class="w-8 rotate-180 text-utility-error">{@html arrow}</div>
    </div>
  </div>

  <div class="flex items-center h-full">
    <div class="w-6 -rotate-90 -mr-1 ml-1">{@html caret}</div>
  </div>
</a>
