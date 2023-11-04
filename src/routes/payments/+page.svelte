<script lang="ts">
  import Msg from '$lib/components/Msg.svelte'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import Spinner from '$lib/components/Spinner.svelte'
  import list from '$lib/icons/list.js'
  import PaymentRow from './PaymentRow.svelte'
  import { fade, slide } from 'svelte/transition'
  import plus from '$lib/icons/plus.js'
  import { translate } from '$lib/i18n/translations.js'
  import VirtualList from 'svelte-tiny-virtual-list'
  import { connections$, wallets$ } from '$lib/streams.js'
  import FilterSort from '$lib/components/FilterSort.svelte'
  import SyncRouteData from '$lib/components/SyncRouteData.svelte'
  import { fetchInvoices, fetchTransactions, fetchUtxos } from '$lib/wallets/index.js'
  import type { Payment, PaymentWithSummary } from '$lib/@types/payments.js'
  import type { Filter, Sorters } from '$lib/@types/common.js'
  import { getFilters, getSorters, getTags } from './filters.js'
  import { storage } from '$lib/services.js'
  import { STORAGE_KEYS } from '$lib/constants.js'
  import { getPayments } from '$lib/db/helpers.js'
  import type { PaymentSummary } from '$lib/summary.js'

  let payments: Payment[] | null = null
  let processing = false
  let filters: Filter[] = getFilters()
  let sorters: Sorters = getSorters()
  let tags: string[] = getTags()

  type timestamp = number
  type DailyPayments = [timestamp, PaymentWithSummary[]][]
  let dailyPayments: DailyPayments = []

  const getCurrentNumLoadedPayments = () =>
    dailyPayments.reduce((total, day) => {
      total += day[1].length
      return total
    }, 0)

  const loadPayments = async () => {
    processing = true

    dailyPayments = await getPayments({
      filters,
      tags,
      sort: sorters.applied,
      limit: 25,
      offset: getCurrentNumLoadedPayments()
    })

    processing = false
  }

  const handleFilterSortUpdate = () => {
    loadPayments()
    updateStoredFiltersAndSorter()
  }

  const updateStoredFiltersAndSorter = () => {
    try {
      storage.write(STORAGE_KEYS.filters.payments, JSON.stringify(filters))
      storage.write(STORAGE_KEYS.sorter.payments, JSON.stringify(sorters))
    } catch (error) {
      // can't write to storage
    }
  }

  let showFullReceiveButton = false

  // need to adjust this if you change the transaction row height
  const rowSize = 88

  let previousOffset = 0
  let direction: 'up' | 'down'
  let processingScroll = false

  const handleTransactionsScroll = (offset: number) => {
    if (processingScroll) return

    if (offset + 10 < previousOffset) {
      processingScroll = true
      requestAnimationFrame(() => {
        if (direction === 'up') {
          showFullReceiveButton = true
        } else {
          direction = 'up'
        }
        processingScroll = false
      })
    } else if (offset > previousOffset) {
      processingScroll = true
      requestAnimationFrame(() => {
        if (direction === 'down') {
          showFullReceiveButton = false
        } else {
          direction = 'down'
        }
        processingScroll = false
      })
    }

    previousOffset = offset
  }

  const getDaySize = (index: number) => {
    const payments = dailyPayments[index][1]
    return payments.length * rowSize + 24 + 8
  }

  let innerHeight: number

  $: maxHeight = innerHeight - 80 - 56 - 24

  $: fullHeight = dailyPayments
    ? dailyPayments.reduce((acc, data) => acc + data[1].length * rowSize + 24 + 8, 0)
    : 0

  $: listHeight = Math.min(maxHeight, fullHeight)
  $: transactionsContainerScrollable = processing
    ? false
    : dailyPayments
    ? fullHeight > listHeight
    : false

  let virtualList: VirtualList

  $: if (dailyPayments) {
    setTimeout(() => virtualList && virtualList.recomputeSizes(0), 25)
  }

  const syncPayments = async () => {
    await Promise.all(
      connections$.value.map(connection =>
        Promise.all([
          fetchInvoices(connection),
          fetchTransactions(connection),
          fetchUtxos(connection)
        ])
      )
    )

    loadPayments()
  }

  loadPayments()
</script>

<svelte:window bind:innerHeight />

<Section>
  <div class="w-full flex items-center justify-between">
    <SectionHeading icon={list} />
    <div class="flex items-center gap-x-2">
      <SyncRouteData sync={syncPayments} />
      <FilterSort bind:filters bind:sorters bind:tags on:updated={handleFilterSortUpdate} />
    </div>
  </div>

  <div class="w-full overflow-hidden flex">
    {#if processing}
      <div in:fade={{ duration: 250 }} class="my-4 w-full flex justify-center">
        <Spinner />
      </div>
    {:else if !dailyPayments.length}
      <div class="mt-4 mb-2 w-full">
        <Msg type="info" closable={false} message={$translate('app.labels.no_payments')} />
      </div>
    {:else}
      <div
        in:fade={{ duration: 250 }}
        class="w-full flex flex-col overflow-hidden gap-y-2 rounded mt-2"
      >
        <VirtualList
          bind:this={virtualList}
          on:afterScroll={e => handleTransactionsScroll(e.detail.offset)}
          width="100%"
          height={listHeight}
          itemCount={dailyPayments.length}
          itemSize={getDaySize}
          getKey={index => dailyPayments[index][0]}
        >
          <div slot="item" let:index let:style {style}>
            <div class="pt-1 pl-1">
              <div
                class="text-xs font-semibold sticky top-1 mb-1 py-1 px-3 rounded bg-neutral-900 w-min whitespace-nowrap shadow shadow-neutral-700/50"
              >
                {dailyPayments[index][0]}
              </div>
              <div class="rounded overflow-hidden">
                <div class="overflow-hidden rounded">
                  <VirtualList
                    width="100%"
                    height={Math.min(dailyPayments[index][1].length * rowSize, maxHeight - 32)}
                    itemCount={dailyPayments[index][1].length}
                    itemSize={rowSize}
                    getKey={innerIndex => dailyPayments[index][1][innerIndex].id}
                  >
                    <div slot="item" let:index={innerIndex} let:style {style}>
                      {@const payment = dailyPayments[index][1][innerIndex]}
                      <PaymentRow {payment} />
                    </div>
                  </VirtualList>
                </div>
              </div>
            </div>
          </div>
        </VirtualList>
      </div>
    {/if}
  </div>

  <div
    class="bottom-0 right-3 w-full flex justify-end mt-2"
    class:absolute={transactionsContainerScrollable}
  >
    <a
      href="/payments/receive"
      class:px-2={transactionsContainerScrollable}
      class:px-4={!transactionsContainerScrollable || showFullReceiveButton}
      class="no-underline flex items-center rounded-full bg-neutral-900 border-2 border-neutral-50 py-2 hover:shadow-lg hover:shadow-neutral-50 mt-4 w-min hover:bg-neutral-800 relative"
      on:mouseenter={() => transactionsContainerScrollable && (showFullReceiveButton = true)}
      on:mouseleave={() => transactionsContainerScrollable && (showFullReceiveButton = false)}
    >
      <div class="absolute top-0 right-0 w-full h-full rounded-full overflow-hidden opacity-70">
        <img src="/images/shell1.png" class="h-full w-full" alt="texture" />
      </div>

      <div
        class="w-6 relative"
        class:-ml-1={!transactionsContainerScrollable || showFullReceiveButton}
      >
        {@html plus}
      </div>

      {#if !transactionsContainerScrollable || showFullReceiveButton}
        <div class="ml-1 font-semibold relative" in:slide|local={{ axis: 'x' }}>
          {$translate('app.labels.receive')}
        </div>
      {/if}
    </a>
  </div>
</Section>
