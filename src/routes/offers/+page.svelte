<script lang="ts">
  import { translate } from '$lib/i18n/translations'
  import lightningOutline from '$lib/icons/lightning-outline'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import { liveQuery } from 'dexie'
  import { db } from '$lib/db.js'
  import Spinner from '$lib/components/Spinner.svelte'
  import Msg from '$lib/components/Msg.svelte'
  import { fade, slide } from 'svelte/transition'
  import VirtualList from 'svelte-tiny-virtual-list'
  import plus from '$lib/icons/plus.js'
  import OfferRow from './OfferRow.svelte'
  import FilterSort from '$lib/components/FilterSort.svelte'
  import type { Offer } from '$lib/@types/offers.js'
  import { filter, from, takeUntil } from 'rxjs'
  import { onDestroy$ } from '$lib/streams.js'

  const offers$ = from(liveQuery(() => db.offers.toArray()))

  let showFullOpenButton = false
  let offersContainer: HTMLDivElement

  $: offersContainerScrollable =
    processed && offersContainer ? processed.length * 74 > offersContainer.clientHeight : false

  let previousOffset = 0

  const handleOffersScroll = (offset: number) => {
    if (offset < previousOffset) {
      showFullOpenButton = true
    } else {
      showFullOpenButton = false
    }

    previousOffset = offset
  }

  let innerHeight: number

  // need to adjust this if you change the transaction row height
  const rowSize = 102

  $: maxHeight = innerHeight - 147 - 56 - 24 - 80
  $: fullHeight = processed ? processed.length * rowSize : 0
  $: listHeight = Math.min(maxHeight, fullHeight)

  type Key = keyof Offer
  type Val = Offer[Key]
  type Filter = { label: string; applied: boolean; key: Key; predicate: (val: Val) => boolean }
  type TagFilter = { tag: string; applied: boolean }
  type Sorter = { label: string; key: Key; direction: 'asc' | 'desc'; applied: boolean }

  let processed: Offer[] = []
  let filters: Filter[] = []
  let tagFilters: TagFilter[] = []

  let sorters: Sorter[] = [
    { label: $translate('app.labels.amount'), key: 'amount', direction: 'desc', applied: false },
    { label: $translate('app.labels.expiry'), key: 'expiry', direction: 'desc', applied: false }
  ]

  // once we have offers, create filters, tag filters
  offers$
    .pipe(
      filter((x) => !!x),
      takeUntil(onDestroy$)
    )
    .subscribe(async (offers) => {
      const walletIdSet = new Set()
      const tagSet = new Set()

      for (const { walletId, id } of offers) {
        walletIdSet.add(walletId)

        const metadata = await db.metadata.get(id)

        if (metadata) {
          metadata.tags.forEach((tag) => tagSet.add(tag))
        }
      }

      const wallets = await db.wallets.bulkGet(Array.from(walletIdSet.values()))

      const walletFilters = wallets.reduce((acc, wallet) => {
        if (wallet) {
          acc.push({
            label: wallet.label,
            applied: true,
            key: 'walletId',
            predicate: (walletId) => walletId === wallet.id
          })
        }

        return acc
      }, [] as Filter[])

      tagFilters = Array.from(tagSet.values()).map((tag) => ({ tag: tag as string, applied: true }))

      filters = [
        {
          label: $translate('app.labels.active'),
          applied: true,
          key: 'active',
          predicate: (val) => val === true
        },
        {
          label: $translate('app.labels.expired'),
          applied: false,
          key: 'expiry',
          predicate: (val) => (val ? (val as number) < Date.now() / 1000 : false)
        },
        ...walletFilters
      ]
    })
</script>

<svelte:head>
  <title>
    {$translate('app.routes./offers.title')}
  </title>
</svelte:head>

<svelte:window bind:innerHeight />

<Section>
  <div class="flex items-center justify-between">
    <SectionHeading icon={lightningOutline} />
    {#if $offers$}
      <FilterSort items={$offers$} bind:filters bind:tagFilters bind:sorters bind:processed />
    {/if}
  </div>

  <div class="w-full overflow-hidden flex flex-grow">
    {#if !$offers$}
      <div in:fade class="mt-4">
        <Spinner />
      </div>
    {:else if !$offers$.length}
      <div class="w-full mt-4">
        <Msg message={$translate('app.labels.no_offers')} type="info" />
      </div>
    {:else}
      <div
        bind:this={offersContainer}
        class="w-full flex flex-col flex-grow overflow-hidden gap-y-2 mt-2"
      >
        <VirtualList
          on:afterScroll={(e) => handleOffersScroll(e.detail.offset)}
          width="100%"
          height={listHeight}
          itemCount={processed.length}
          itemSize={rowSize}
          getKey={(index) => processed[index].id}
        >
          <div slot="item" let:index let:style {style}>
            <OfferRow offer={processed[index]} />
          </div>
        </VirtualList>
      </div>
    {/if}
  </div>

  <div class="w-full flex justify-end">
    <a
      href="/offers/offer/create"
      class:absolute={offersContainerScrollable}
      class:px-2={offersContainerScrollable}
      class:px-4={!offersContainerScrollable || showFullOpenButton}
      class="bottom-2 right-2 no-underline flex items-center rounded-full bg-neutral-900 border-2 border-neutral-50 py-2 hover:shadow-lg hover:shadow-neutral-50 mt-4 w-min hover:bg-neutral-800 relative"
      on:mouseenter={() => offersContainerScrollable && (showFullOpenButton = true)}
      on:mouseleave={() => offersContainerScrollable && (showFullOpenButton = false)}
    >
      <div class="absolute top-0 right-0 w-full h-full rounded-full overflow-hidden opacity-70">
        <img src="/images/shell1.png" class="h-full w-full" alt="texture" />
      </div>

      <div class="w-6 -ml-1 relative">{@html plus}</div>

      {#if !offersContainerScrollable || showFullOpenButton}
        <div class="font-semibold relative" in:slide|local={{ axis: 'x' }}>
          {$translate('app.labels.create')}
        </div>
      {/if}
    </a>
  </div>
</Section>
