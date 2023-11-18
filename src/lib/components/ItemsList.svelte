<script lang="ts">
  import { translate } from '$lib/i18n/translations.js'
  import type { Connection } from '$lib/wallets/interfaces.js'
  import Msg from '$lib/components/Msg.svelte'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import Spinner from '$lib/components/Spinner.svelte'
  import list from '$lib/icons/list.js'
  import { fade, slide } from 'svelte/transition'
  import VirtualList from 'svelte-tiny-virtual-list'
  import { connections$ } from '$lib/streams.js'
  import FilterSort from '$lib/components/FilterSort.svelte'
  import SyncRouteData from '$lib/components/SyncRouteData.svelte'
  import type { Filter, Sorters } from '$lib/@types/common.js'
  import { storage } from '$lib/services.js'
  import { FILTER_STORAGE_KEYS } from '$lib/constants.js'
  import { getSortedFilteredItems } from '$lib/db/helpers.js'
  import { anyFiltersApplied } from '$lib/utils.js'

  type T = $$Generic
  type Item = T & { id: string }

  export let items: Item[] = []
  export let filters: Filter[]
  export let sorters: Sorters
  export let tags: string[]
  export let route: string
  export let rowSize: number
  export let limit = 40
  export let sync: (connection: Connection) => Promise<void>
  export let button: { text: string; icon: string; href: string } | null = null
  export let dedupe: ((items: Item[]) => Promise<Item[]>) | null = null

  let processing = false
  let gettingMoreItems = false
  let noMoreItems = false

  const loadItems = async () => {
    processing = true

    const rawItems = (await getSortedFilteredItems({
      filters,
      tags,
      sort: sorters.applied,
      limit,
      table: route
    })) as Item[]

    if (dedupe) {
      items = await dedupe(rawItems)
    } else {
      items = rawItems
    }

    processing = false
  }

  const getMoreItems = async () => {
    if (noMoreItems) return

    gettingMoreItems = true

    let moreItems = (await getSortedFilteredItems({
      filters,
      tags,
      sort: sorters.applied,
      limit,
      lastItem: items[items.length - 1],
      table: route
    })) as Item[]

    if (dedupe) {
      moreItems = await dedupe(moreItems)
    }

    if (moreItems.length) {
      items = [...items, ...moreItems]
    } else {
      noMoreItems = true
    }

    gettingMoreItems = false
  }

  $: filtersApplied = anyFiltersApplied(filters)

  const handleFilterSortUpdate = () => {
    noMoreItems = false
    loadItems()
    updateStoredFiltersAndSorter()
  }

  const updateStoredFiltersAndSorter = () => {
    try {
      storage.write(FILTER_STORAGE_KEYS.filters[route], JSON.stringify(filters))
      storage.write(FILTER_STORAGE_KEYS.sorter[route], JSON.stringify(sorters.applied))
    } catch (error) {
      // can't write to storage
    }
  }

  let showFullButton = false
  let previousOffset = 0
  let direction: 'up' | 'down'
  let processingScroll = false

  const handleScroll = (offset: number, diff: number) => {
    // scrolled to bottom
    if (offset === diff) {
      getMoreItems()
    }

    if (processingScroll) return

    if (offset + 10 < previousOffset) {
      processingScroll = true
      requestAnimationFrame(() => {
        if (direction === 'up') {
          showFullButton = true
        } else {
          direction = 'up'
        }
        processingScroll = false
      })
    } else if (offset > previousOffset) {
      processingScroll = true
      requestAnimationFrame(() => {
        if (direction === 'down') {
          showFullButton = false
        } else {
          direction = 'down'
        }
        processingScroll = false
      })
    }

    previousOffset = offset
  }

  let innerHeight: number
  let virtualList: VirtualList

  $: maxHeight = innerHeight ? innerHeight - 80 - 56 - 80 : 0
  $: fullHeight = items ? items.length * rowSize : 0
  $: listHeight = Math.min(maxHeight, fullHeight)

  $: containerScrollable = processing ? false : items.length ? fullHeight > listHeight : false

  $: if (items.length) {
    setTimeout(() => virtualList && virtualList.recomputeSizes(0), 25)
  }

  const syncItems = async () => {
    await Promise.all(connections$.value.map(connection => sync(connection)))
    loadItems()
  }

  loadItems()
</script>

<svelte:window bind:innerHeight />

<Section>
  <div class="w-full flex items-center justify-between">
    <SectionHeading icon={list} />
    <div class="flex items-center gap-x-2">
      <SyncRouteData sync={syncItems} />
      <FilterSort bind:filters bind:sorters bind:tags {route} on:updated={handleFilterSortUpdate} />
    </div>
  </div>

  <slot name="summary" />

  <div class="w-full flex overflow-hidden">
    {#if processing}
      <div in:fade={{ duration: 250 }} class="my-4 w-full flex justify-center">
        <Spinner />
      </div>
    {:else if !items.length}
      <div class="mt-4 mb-2 w-full">
        <Msg
          type="info"
          closable={false}
          message={$translate(
            `app.labels.${filtersApplied ? `no_${route}_filtered` : `no_${route}`}`
          )}
        />
      </div>
    {:else}
      <div class="w-full flex flex-col justify-center items-center gap-y-2 rounded mt-2">
        <VirtualList
          bind:this={virtualList}
          on:afterScroll={e => handleScroll(e.detail.offset, fullHeight - listHeight)}
          width="100%"
          height={listHeight}
          itemCount={items.length}
          itemSize={rowSize}
          getKey={index => items[index].id}
        >
          <div slot="item" let:index let:style {style}>
            {@const item = items[index]}
            <slot name="row" {item} />
          </div>
        </VirtualList>

        {#if gettingMoreItems}
          <div class="absolute bottom-1 text-neutral-500">
            <Spinner size="1.5rem" />
          </div>
        {/if}
      </div>
    {/if}
  </div>

  {#if button}
    <div class="bottom-6 right-8 flex justify-end mt-2" class:absolute={containerScrollable}>
      <a
        href={button.href}
        class:px-2={containerScrollable}
        class:px-4={!containerScrollable || showFullButton}
        class="no-underline flex items-center rounded-full bg-neutral-900 border-2 border-neutral-50 py-2 hover:shadow-lg hover:shadow-neutral-50 mt-4 w-min hover:bg-neutral-800 relative"
        on:mouseenter={() => containerScrollable && (showFullButton = true)}
        on:mouseleave={() => containerScrollable && (showFullButton = false)}
      >
        <div class="absolute top-0 right-0 w-full h-full rounded-full overflow-hidden opacity-70">
          <img src="/images/shell1.png" class="h-full w-full" alt="texture" />
        </div>

        <div class="w-6 relative" class:-ml-1={!containerScrollable || showFullButton}>
          {@html button.icon}
        </div>

        {#if !containerScrollable || showFullButton}
          <div class="ml-1 font-semibold relative" in:slide|local={{ axis: 'x' }}>
            {button.text}
          </div>
        {/if}
      </a>
    </div>
  {/if}
</Section>
