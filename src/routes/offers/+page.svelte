<script lang="ts">
  import { translate } from '$lib/i18n/translations'
  import lightningOutline from '$lib/icons/lightning-outline'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import { liveQuery } from 'dexie'
  import { db } from '$lib/db/index.js'
  import Spinner from '$lib/components/Spinner.svelte'
  import Msg from '$lib/components/Msg.svelte'
  import { fade, slide } from 'svelte/transition'
  import VirtualList from 'svelte-tiny-virtual-list'
  import plus from '$lib/icons/plus.js'
  import OfferRow from './OfferRow.svelte'
  import FilterSort from '$lib/components/FilterSort.svelte'
  import type { Offer } from '$lib/@types/offers.js'
  import { filter, from, takeUntil } from 'rxjs'
  import { connections$, onDestroy$ } from '$lib/streams.js'
  import type { Filter, Sorter, TagFilter } from '$lib/@types/common.js'
  import SyncRouteData from '$lib/components/SyncRouteData.svelte'
  import { fetchInvoices, fetchOffers } from '$lib/wallets/index.js'

  const offers$ = from(liveQuery(() => db.offers.toArray()))

  let showFullOpenButton = false
  let offersContainer: HTMLDivElement

  let previousOffset = 0
  let direction: 'up' | 'down'
  let processingScroll = false

  const handleOffersScroll = (offset: number) => {
    if (processingScroll) return

    if (offset + 2 < previousOffset) {
      processingScroll = true
      requestAnimationFrame(() => {
        if (direction === 'up') {
          showFullOpenButton = true
        } else {
          direction = 'up'
        }
        processingScroll = false
      })
    } else if (offset > previousOffset) {
      processingScroll = true
      requestAnimationFrame(() => {
        if (direction === 'down') {
          showFullOpenButton = false
        } else {
          direction = 'down'
        }
        processingScroll = false
      })
    }

    previousOffset = offset
  }

  let innerHeight: number

  // need to adjust this if you change the transaction row height
  const rowSize = 102

  $: maxHeight = innerHeight - 80 - 56 - 24
  $: fullHeight = processed ? processed.length * rowSize : 0
  $: listHeight = Math.min(maxHeight, fullHeight)
  $: offersContainerScrollable = processed ? processed.length * rowSize > listHeight : false

  let processed: Offer[] = []
  let filters: Filter[] = []
  let tagFilters: TagFilter[] = []

  let sorters: Sorter[] = [
    { label: $translate('app.labels.active'), key: 'active', direction: 'desc' },
    { label: $translate('app.labels.amount'), key: 'amount', direction: 'desc' },
    { label: $translate('app.labels.expiry'), key: 'expiry', direction: 'desc' }
  ]

  // once we have offers, create filters, tag filters
  offers$
    .pipe(
      filter(x => !!x),
      takeUntil(onDestroy$)
    )
    .subscribe(async offers => {
      const walletIdSet = new Set<string>()
      const tagSet = new Set()

      for (const { walletId, id } of offers) {
        walletIdSet.add(walletId)

        const metadata = await db.metadata.get(id)

        if (metadata) {
          metadata.tags.forEach(tag => tagSet.add(tag))
        }
      }

      const wallets = await db.wallets.bulkGet(Array.from(walletIdSet.values()))

      const walletFilter = {
        label: $translate('app.labels.wallet'),
        values: wallets.reduce((acc, wallet) => {
          if (wallet) {
            acc.push({
              label: wallet.label,
              checked: false,
              predicate: {
                key: 'walletId',
                values: [wallet.id]
              }
            })
          }

          return acc
        }, [] as Filter['values'])
      }

      tagFilters = Array.from(tagSet.values()).map(tag => ({
        tag: tag as string,
        checked: false
      }))

      filters = [
        {
          label: $translate('app.labels.status'),
          values: [
            {
              label: $translate('app.labels.active'),
              checked: false,
              predicate: {
                key: 'active',
                values: [true]
              }
            },
            {
              label: $translate('app.labels.expired'),
              checked: false,
              predicate: {
                key: 'expiry',
                values: [Date.now() / 1000],
                compare: 'gt'
              }
            }
          ]
        },
        walletFilter
      ]
    })

  let virtualList: VirtualList

  $: if (virtualList && processed) {
    setTimeout(() => virtualList.recomputeSizes(0), 25)
  }

  const syncOffers = async () => {
    await Promise.all(
      connections$.value.map(connection =>
        Promise.all([fetchOffers(connection), fetchInvoices(connection)])
      )
    )
  }
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
      <div class="flex items-center gap-x-2">
        <SyncRouteData sync={syncOffers} />
        <FilterSort items={$offers$} bind:filters bind:tagFilters bind:sorters bind:processed />
      </div>
    {/if}
  </div>

  <div class="w-full overflow-hidden flex flex-grow">
    {#if !$offers$}
      <div in:fade class="mt-4">
        <Spinner />
      </div>
    {:else if !$offers$.length}
      <div class="w-full mt-4 mb-2">
        <Msg message={$translate('app.labels.no_offers')} type="info" closable={false} />
      </div>
    {:else if processed}
      <div
        bind:this={offersContainer}
        class="w-full flex flex-col flex-grow overflow-hidden gap-y-2 mt-2"
      >
        <VirtualList
          bind:this={virtualList}
          on:afterScroll={e => handleOffersScroll(e.detail.offset)}
          width="100%"
          height={listHeight}
          itemCount={processed.length}
          itemSize={rowSize}
          getKey={index => processed[index].id}
        >
          <div slot="item" let:index let:style {style}>
            <OfferRow offer={processed[index]} />
          </div>
        </VirtualList>
      </div>
    {/if}
  </div>

  <div
    class="bottom-0 right-3 w-full flex justify-end mt-2"
    class:absolute={offersContainerScrollable}
  >
    <a
      href="/offers/offer/create"
      class:absolute={offersContainerScrollable}
      class:px-2={offersContainerScrollable}
      class:px-4={!offersContainerScrollable || showFullOpenButton}
      class="no-underline flex items-center rounded-full bg-neutral-900 border-2 border-neutral-50 py-2 hover:shadow-lg hover:shadow-neutral-50 mt-4 w-min hover:bg-neutral-800 relative"
      on:mouseenter={() => offersContainerScrollable && (showFullOpenButton = true)}
      on:mouseleave={() => offersContainerScrollable && (showFullOpenButton = false)}
    >
      <div class="absolute top-0 right-0 w-full h-full rounded-full overflow-hidden opacity-70">
        <img src="/images/shell1.png" class="h-full w-full" alt="texture" />
      </div>

      <div class="w-6 relative" class:-ml-1={!offersContainerScrollable || showFullOpenButton}>
        {@html plus}
      </div>

      {#if !offersContainerScrollable || showFullOpenButton}
        <div class="font-semibold relative" in:slide|local={{ axis: 'x' }}>
          {$translate('app.labels.create')}
        </div>
      {/if}
    </a>
  </div>
</Section>
