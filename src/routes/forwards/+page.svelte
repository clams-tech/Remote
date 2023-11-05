<script lang="ts">
  import { translate } from '$lib/i18n/translations'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import Spinner from '$lib/components/Spinner.svelte'
  import Msg from '$lib/components/Msg.svelte'
  import { fade } from 'svelte/transition'
  import VirtualList from 'svelte-tiny-virtual-list'
  import ForwardRow from './ForwardRow.svelte'
  import forward from '$lib/icons/forward.js'
  import type { Forward } from '$lib/@types/forwards.js'
  import { connections$ } from '$lib/streams.js'
  import FilterSort from '$lib/components/FilterSort.svelte'
  import SyncRouteData from '$lib/components/SyncRouteData.svelte'
  import { fetchForwards } from '$lib/wallets/index.js'
  import { getDefaultFilterOptions, getFilters, getSorters, getTags } from './filters.js'
  import type { Filter, Sorters } from '$lib/@types/common.js'
  import { storage } from '$lib/services.js'
  import { STORAGE_KEYS } from '$lib/constants.js'
  import { getDailyForwards } from '$lib/db/helpers.js'

  let processing = false
  let gettingMore = false
  let filters: Filter[] = getFilters()
  let sorters: Sorters = getSorters()
  let tags: string[] = getTags()

  type timestamp = number
  type DailyItems = [timestamp, Forward[]][]
  let dailyItems: DailyItems = []

  const getCurrentNumLoaded = () =>
    dailyItems.reduce((total, day) => {
      total += day[1].length
      return total
    }, 0)

  const loadItems = async () => {
    processing = true

    dailyItems = await getDailyForwards({
      filters,
      tags,
      sort: sorters.applied,
      limit: 25,
      offset: 0
    })

    processing = false
  }

  const getMore = async () => {
    gettingMore = true
    const lastDay = dailyItems[dailyItems.length - 1]
    const lastForward = lastDay[1][lastDay[1].length - 1]

    const more = await getDailyForwards({
      filters,
      tags,
      sort: sorters.applied,
      limit: 25,
      offset: getCurrentNumLoaded(),
      lastForward
    })

    const moreFirstDay = more.shift()

    if (moreFirstDay) {
      // add payments to the last day as they have the same date
      if (lastDay[0] === moreFirstDay[0]) {
        lastDay[1].push(...moreFirstDay[1])
      }

      dailyItems = [...dailyItems, ...more]
    }

    gettingMore = false
  }

  $: filtersApplied = JSON.stringify(filters) !== JSON.stringify(getDefaultFilterOptions())

  const handleFilterSortUpdate = () => {
    loadItems()
    updateStoredFiltersAndSorter()
  }

  const updateStoredFiltersAndSorter = () => {
    try {
      storage.write(STORAGE_KEYS.filters.forwards, JSON.stringify(filters))
      storage.write(STORAGE_KEYS.sorter.forwards, JSON.stringify(sorters.applied))
    } catch (error) {
      // can't write to storage
    }
  }

  const handleTransactionsScroll = (offset: number) => {
    // scrolled to bottom
    if (offset >= bottom) {
      getMore()
    }
  }

  // need to adjust this if you change the forward row height
  const rowSize = 104

  let innerHeight: number

  $: maxHeight = innerHeight ? innerHeight - 80 - 56 - 80 : 0

  $: fullHeight = dailyItems.length
    ? dailyItems.reduce((acc, data) => acc + data[1].length * rowSize + 24 + 8, 0)
    : 0

  $: bottom = fullHeight - maxHeight

  $: listHeight = Math.min(maxHeight, fullHeight)

  let virtualList: VirtualList

  $: if (dailyItems.length) {
    setTimeout(() => virtualList && virtualList.recomputeSizes(0), 25)
  }

  const getDaySize = (index: number) => {
    const forwards = dailyItems[index][1]
    return Math.min(forwards.length * rowSize + 24 + 8, maxHeight)
  }

  const syncForwards = async () => {
    await Promise.all(connections$.value.map(connection => fetchForwards(connection)))
    loadItems()
  }

  loadItems()
</script>

<svelte:head>
  <title>
    {$translate('app.routes./forwards.title')}
  </title>
</svelte:head>

<svelte:window bind:innerHeight />

<Section>
  <div class="flex items-center justify-between">
    <SectionHeading icon={forward} />

    <div class="flex items-center gap-x-2">
      <SyncRouteData sync={syncForwards} />
      <FilterSort bind:filters bind:tags on:updated={handleFilterSortUpdate} bind:sorters />
    </div>
  </div>

  <div class="w-full flex">
    {#if processing}
      <div in:fade class="mt-4 w-full">
        <Spinner />
      </div>
    {:else if !dailyItems.length}
      <div class="mt-4 mb-2 w-full">
        <Msg
          type="info"
          closable={false}
          message={$translate(
            `app.labels.${filtersApplied ? 'no_forwards_filtered' : 'no_forwards'}`
          )}
        />
      </div>
    {:else}
      <div class="w-full flex flex-col justify-center items-center gap-y-2 rounded mt-2">
        <VirtualList
          bind:this={virtualList}
          on:afterScroll={e => handleTransactionsScroll(e.detail.offset)}
          width="100%"
          height={listHeight}
          itemCount={dailyItems.length}
          itemSize={getDaySize}
          getKey={index => dailyItems[index][0]}
        >
          <div slot="item" let:index let:style {style}>
            <div class="pt-1">
              <div
                class="text-xs font-semibold sticky top-1 mb-1 py-1 px-3 rounded bg-neutral-900 w-min whitespace-nowrap shadow shadow-neutral-700/50"
              >
                <!-- day date -->
                {dailyItems[index][0]}
              </div>
              <div class="rounded overflow-hidden">
                <div class="overflow-hidden rounded">
                  <VirtualList
                    on:afterScroll={e => handleTransactionsScroll(e.detail.offset)}
                    width="100%"
                    height={Math.min(dailyItems[index][1].length * rowSize, maxHeight - 32)}
                    itemCount={dailyItems[index][1].length}
                    itemSize={rowSize}
                    getKey={innerIndex => dailyItems[index][1][innerIndex].id}
                  >
                    <div slot="item" let:index={innerIndex} let:style {style}>
                      {@const forward = dailyItems[index][1][innerIndex]}
                      <ForwardRow {forward} />
                    </div>
                  </VirtualList>
                </div>
              </div>
            </div>
          </div>
        </VirtualList>

        {#if gettingMore}
          <div class="absolute bottom-1 text-neutral-500">
            <Spinner size="1.5rem" />
          </div>
        {/if}
      </div>
    {/if}
  </div>
</Section>
