<script lang="ts">
  import { takeUntil, timer } from 'rxjs'
  import { translate } from '$lib/i18n/translations.js'
  import type { Connection } from '$lib/wallets/interfaces.js'
  import Msg from '$lib/components/Msg.svelte'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import Spinner from '$lib/components/Spinner.svelte'
  import list from '$lib/icons/list.js'
  import { fade, slide } from 'svelte/transition'
  import VirtualList from 'svelte-tiny-virtual-list'
  import { connections$, larpMode$, onDestroy$ } from '$lib/streams.js'
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
  let initialLoad = true

  const loadItems = async () => {
    try {
      if (initialLoad) {
        processing = true
      }

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

      if (initialLoad) {
        processing = false
        initialLoad = false
      }
    } catch (error) {
      console.log(error)
    }
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
      lastItemKey: 'id',
      table: route
    })) as Item[]

    if (moreItems.length) {
      const newItems = [...items, ...moreItems]
      items = dedupe ? await dedupe(newItems) : newItems
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

  const handleScroll = (offset: number) => {
    const diff = fullHeight - listHeight

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

  let outerContainerHeight: number
  let headerContainerHeight: number
  let virtualList: VirtualList

  $: fullHeight = items ? items.length * rowSize : 0
  $: containerHeight = outerContainerHeight - headerContainerHeight - 32
  $: listHeight = containerHeight ? Math.min(containerHeight, fullHeight) : 0

  $: containerScrollable = processing
    ? false
    : items.length
    ? containerHeight - listHeight <= 76
    : false

  $: if (items.length) {
    setTimeout(() => virtualList && virtualList.recomputeSizes(0), 25)
  }

  const syncItems = async () => {
    try {
      await Promise.all(connections$.value.map(connection => connection.info && sync(connection)))
    } catch (error) {
      const { message } = (error as Error) || { message: 'Unknown error' }
      console.error(`Error syncing items: ${message}`)
    }

    loadItems()
  }

  loadItems()

  // larp mode polling
  if (larpMode$.value) {
    timer(1000, 3000)
      .pipe(takeUntil(onDestroy$))
      .subscribe(async () => {
        try {
          await syncItems()
        } catch (error) {
          const { message } = error as Error
          console.error(`Error syncing items: ${message}`)
        }
      })
  }
</script>

<div
  bind:clientHeight={outerContainerHeight}
  class="w-full h-full flex items-center justify-center"
>
  <Section>
    <div bind:clientHeight={headerContainerHeight}>
      <div class="w-full flex items-center justify-between">
        <SectionHeading icon={list} />
        <div class="flex items-center gap-x-2">
          <SyncRouteData sync={syncItems} />
          <FilterSort
            bind:filters
            bind:sorters
            bind:tags
            {route}
            on:updated={handleFilterSortUpdate}
          />
        </div>
      </div>

      <slot name="summary" />
    </div>

    <div class="w-full overflow-hidden">
      {#if processing && initialLoad}
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
        <div
          class="w-full flex flex-col items-center justify-center max-h-full overflow-hidden relative rounded"
        >
          <VirtualList
            bind:this={virtualList}
            on:afterScroll={e => handleScroll(e.detail.offset)}
            height={listHeight}
            itemCount={items.length}
            width="100%"
            itemSize={rowSize}
            getKey={index => items[index].id}
          >
            <div slot="item" let:index let:style {style}>
              {@const item = items[index]}
              <slot name="row" {item} />
            </div>
          </VirtualList>

          {#if gettingMoreItems}
            <div class="absolute bottom-2 text-neutral-200 opacity-30">
              <Spinner size="1.5rem" />
            </div>
          {/if}
        </div>
      {/if}
    </div>

    {#if button}
      <div class="bottom-2 right-2 flex justify-end pt-2" class:absolute={containerScrollable}>
        <a
          href={button.href}
          class:px-4={!containerScrollable || showFullButton}
          class="no-underline flex items-center rounded-full bg-neutral-900 border-2 px-1.5 border-neutral-50 py-[0.375em] hover:shadow-lg hover:shadow-neutral-50 w-min hover:bg-neutral-800 relative"
          on:mouseenter={() => containerScrollable && (showFullButton = true)}
          on:mouseleave={() => containerScrollable && (showFullButton = false)}
        >
          <div class="absolute top-0 right-0 w-full h-full rounded-full overflow-hidden opacity-70">
            <img src="/images/shell1.png" class="h-full w-full" alt="texture" />
          </div>

          <div class="w-6 relative" class:-ml-2={!containerScrollable || showFullButton}>
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
</div>
