<script lang="ts">
  import type { Offer } from '$lib/@types/offers.js'
  import type { InvoicePayment } from '$lib/@types/payments.js'
  import type { Wallet } from '$lib/@types/wallets.js'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import { db } from '$lib/db/index.js'
  import { translate } from '$lib/i18n/translations.js'
  import caret from '$lib/icons/caret.js'
  import trendingDown from '$lib/icons/trending-down.js'
  import trendingUp from '$lib/icons/trending-up.js'
  import { nowSeconds } from '$lib/utils.js'
  import { liveQuery } from 'dexie'
  import { map, timer } from 'rxjs'

  export let offer: Offer

  const query =
    offer.type === 'withdraw'
      ? {
          'data.direction': 'send',
          'data.amount': offer.amount
        }
      : { 'data.offer.id': offer?.id }

  const offerPayments$ = liveQuery(() =>
    db.payments
      .where(query)
      .filter(payment => {
        const { data } = payment as InvoicePayment

        return (
          data.offer?.description === offer.description &&
          data.offer?.issuer === offer.issuer &&
          (offer.type === 'withdraw' ? !data.offer.id : !!data.offer.id)
        )
      })
      .toArray()
  )

  const now$ = timer(0, 1000).pipe(map(nowSeconds))

  $: status =
    offer.expiry && offer.expiry < $now$
      ? 'expired'
      : offer.active
      ? 'active'
      : offer.singleUse && ($offerPayments$?.length || offer.used)
      ? 'complete'
      : 'disabled'

  let wallet: Wallet

  db.wallets.get(offer.walletId).then(result => {
    if (result) {
      wallet = result
    }
  })
</script>

<a
  href={`/offers/${offer.id}`}
  class="w-full flex items-start justify-between no-underline hover:bg-neutral-800/80 bg-neutral-900 transition-all p-4 rounded h-[102px]"
>
  <div>
    <div class="font-semibold">{offer.label || $translate('app.labels.offer')}</div>

    {#if offer.description}
      <div class="w-full text-xs italic truncate whitespace-nowrap pr-1">{offer.description}</div>
    {/if}

    {#if wallet}
      <div
        class="font-semibold text-purple-100 bg-neutral-800 rounded-full px-2 w-min mt-1 text-sm"
      >
        {wallet.label}
      </div>
    {/if}
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

      <div class="w-full flex justify-end">
        <div
          class="flex items-center w-min text-xs font-semibold bg-neutral-800 mt-1 rounded-full px-3 h-5"
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
            <div
              class="ml-1.5 w-4 h-4 leading-none flex items-center justify-center rounded-full bg-neutral-900 -mr-1"
            >
              {$offerPayments$.length}
            </div>
          {/if}
        </div>
      </div>
    </div>

    <div class="w-6 -rotate-90 -mr-1 ml-1">{@html caret}</div>
  </div>
</a>
