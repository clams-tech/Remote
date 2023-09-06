<script lang="ts">
  import type { Offer } from '$lib/@types/offers.js'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import { db } from '$lib/db.js'
  import { translate } from '$lib/i18n/translations.js'
  import caret from '$lib/icons/caret.js'
  import trendingDown from '$lib/icons/trending-down.js'
  import trendingUp from '$lib/icons/trending-up.js'
  import { nowSeconds } from '$lib/utils.js'
  import { liveQuery } from 'dexie'
  import { map, timer } from 'rxjs'

  export let offer: Offer

  console.log({ offer })

  const offerPayments$ = liveQuery(() => db.invoices.where({ 'offer.id': offer.id }).toArray())

  const now$ = timer(0, 1000).pipe(map(nowSeconds))

  $: status =
    offer.expiry && offer.expiry < $now$
      ? 'expired'
      : offer.active
      ? 'active'
      : offer.singleUse && $offerPayments$?.length
      ? 'complete'
      : 'disabled'

  /** What best summarises an offer
   * Label
   * Amount
   * Status (expired, active, complete or disabled)
   * Type (withdraw or pay)
   * How many payments have been made to this offer
   */
</script>

<a
  href={`/offers/${offer.id}`}
  class="w-full flex items-start justify-between no-underline hover:bg-neutral-800 transition-all p-4 rounded h-[80px]"
>
  <div>
    <div class="font-semibold">{offer.label || $translate('app.labels.offer')}</div>

    <div
      class="flex items-center w-min text-xs font-semibold bg-neutral-800 mt-1 rounded-full px-3 h-6"
    >
      <div
        class="w-4 mr-1 -ml-1"
        class:text-utility-success={offer.type === 'pay'}
        class:text-utility-error={offer.type === 'withdraw'}
      >
        {@html offer.type === 'pay' ? trendingUp : trendingDown}
      </div>

      <div>{$translate(`app.labels.${offer.type}`)}</div>

      {#if $offerPayments$ && $offerPayments$.length}
        <div class="ml-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-neutral-900">
          {$offerPayments$.length}
        </div>
      {/if}
    </div>
  </div>

  <div class="flex items-center ml-4 h-full">
    <div>
      <div
        class:text-utility-success={status === 'active' || status === 'complete'}
        class:text-utility-error={status === 'expired' || status === 'disabled'}
        class="flex items-center justify-end text-xs"
      >
        <div
          class:bg-utility-success={status === 'active' || status === 'complete'}
          class:bg-utility-error={status === 'expired' || status === 'disabled'}
          class="w-1.5 h-1.5 rounded-full mr-1"
        />
        <div>{$translate(`app.labels.${status}`)}</div>
      </div>

      {#if offer.amount && status !== 'expired'}
        <BitcoinAmount sats={offer.amount} />
      {/if}
    </div>

    <div class="w-6 -rotate-90">{@html caret}</div>
  </div>
</a>
