<script lang="ts">
  import { db } from '$lib/db/index.js'
  import Msg from '$lib/components/Msg.svelte'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import Spinner from '$lib/components/Spinner.svelte'
  import list from '$lib/icons/list.js'
  import PaymentRow from './PaymentRow.svelte'
  import { fade, slide } from 'svelte/transition'
  import { inPlaceSort } from 'fast-sort'
  import { formatDate } from '$lib/dates.js'
  import plus from '$lib/icons/plus.js'
  import { translate } from '$lib/i18n/translations.js'
  import VirtualList from 'svelte-tiny-virtual-list'
  import { filter, firstValueFrom, map, takeUntil } from 'rxjs'
  import { onDestroy$ } from '$lib/streams.js'
  import FilterSort from '$lib/components/FilterSort.svelte'
  import type { Filter, Payment, Sorter, TagFilter } from '$lib/@types/common.js'
  import type { PaymentSummary } from '$lib/summary.js'
  import { getPaymentSummary, payments$ } from '$lib/db/helpers.js'
  import debounce from 'lodash.debounce'
  import DayDate from './DayDate.svelte'
  import { appWorker, appWorkerMessages$ } from '$lib/worker.js'
  import { createRandomHex } from '$lib/crypto.js'

  let processed: Payment[] = []
  let filters: Filter[] = []
  let tagFilters: TagFilter[] = []

  let sorters: Sorter[] = [
    { label: $translate('app.labels.date'), key: 'timestamp', direction: 'desc' }
  ]

  payments$.pipe(takeUntil(onDestroy$)).subscribe(async payments => {
    const walletIdSet = new Set<string>()
    const tagSet = new Set()

    for (const { walletId, id } of payments) {
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
            predicate: { key: 'walletId', values: [wallet.id] }
          })
        }

        return acc
      }, [] as Filter['values'])
    }

    tagFilters = Array.from(tagSet.values()).map(tag => ({ tag: tag as string, checked: false }))

    filters = [
      {
        label: $translate('app.labels.status'),
        values: [
          {
            label: $translate('app.labels.pending'),
            checked: false,
            predicate: {
              key: 'status',
              values: ['pending']
            }
          },
          {
            label: $translate('app.labels.waiting'),
            checked: false,
            predicate: {
              key: 'status',
              values: ['waiting']
            }
          },
          {
            label: $translate('app.labels.complete'),
            checked: false,
            predicate: {
              key: 'status',
              values: ['complete']
            }
          },
          {
            label: $translate('app.labels.expired'),
            checked: false,
            predicate: {
              key: 'status',
              values: ['expired']
            }
          },
          {
            label: $translate('app.labels.failed'),
            checked: false,
            predicate: {
              key: 'status',
              values: ['failed']
            }
          }
        ]
      },
      {
        label: $translate('app.labels.type'),
        values: [
          {
            label: $translate('app.labels.lightning'),
            checked: false,
            predicate: {
              key: 'type',
              values: ['invoice']
            }
          },
          {
            label: $translate('app.labels.onchain'),
            checked: false,
            predicate: {
              key: 'type',
              values: ['transaction', 'address']
            }
          },
          {
            label: $translate('app.labels.channel'),
            checked: false,
            predicate: {
              key: 'channel',
              values: [],
              compare: 'exists'
            }
          },
          {
            label: $translate('app.labels.offer'),
            checked: false,
            predicate: {
              key: 'offer',
              values: [],
              compare: 'exists'
            }
          }
        ]
      },
      walletFilter,
      {
        label: $translate('app.labels.network'),
        values: [
          {
            label: $translate('app.labels.bitcoin'),
            checked: false,
            predicate: {
              key: 'network',
              values: ['bitcoin']
            }
          },
          {
            label: $translate('app.labels.regtest'),
            checked: false,
            predicate: {
              key: 'network',
              values: ['regtest']
            }
          },
          {
            label: $translate('app.labels.testnet'),
            checked: false,
            predicate: {
              key: 'network',
              values: ['testnet']
            }
          }
        ]
      }
    ]
  })

  type PaymentChunks = [number, Payment[]][]
  let dailyPaymentChunks: PaymentChunks = []

  const sortDailyChunks = async () => {
    const id = createRandomHex()

    appWorker.postMessage({
      id,
      type: 'sort-daily-payment-chunks',
      payments: processed,
      direction: sorters[0].direction
    })

    dailyPaymentChunks = (await firstValueFrom(
      appWorkerMessages$.pipe(
        filter(message => message.data.id === id),
        map(({ data }) => data.result)
      )
    )) as PaymentChunks
  }

  $: if (processed) {
    sortDailyChunks()
  }

  let showFullReceiveButton = false
  let transactionsContainer: HTMLDivElement

  // need to adjust this if you change the transaction row height
  const rowSize = 88

  let previousOffset = 0

  const handleTransactionsScroll = debounce((offset: number) => {
    if (offset < previousOffset) {
      showFullReceiveButton = true
    } else {
      showFullReceiveButton = false
    }

    previousOffset = offset
  }, 50)

  const getDaySize = (index: number) => {
    const payments = dailyPaymentChunks[index][1]
    return payments.length * rowSize + 24 + 8
  }

  let innerHeight: number

  $: maxHeight = innerHeight - 80 - 56 - 24

  $: fullHeight = dailyPaymentChunks
    ? dailyPaymentChunks.reduce((acc, data) => acc + data[1].length * rowSize + 24 + 8, 0)
    : 0

  $: listHeight = Math.min(maxHeight, fullHeight)
  $: transactionsContainerScrollable = dailyPaymentChunks ? fullHeight > listHeight : false

  let virtualList: VirtualList

  $: if (virtualList && processed && dailyPaymentChunks) {
    setTimeout(() => virtualList.recomputeSizes(0), 25)
  }

  const summaryCache: Record<string, { summary: PaymentSummary; formattedTimestamp: string }> = {}

  const getSummary = async (
    payment: Payment
  ): Promise<{ summary: PaymentSummary; formattedTimestamp: string }> => {
    const cached = summaryCache[payment.id]

    if (cached) return cached

    const summary = await getPaymentSummary(payment)
    const formattedTimestamp = await formatDate(summary.timestamp, 'hh:mma')
    summaryCache[payment.id] = { summary, formattedTimestamp }
    return { summary, formattedTimestamp }
  }
</script>

<svelte:window bind:innerHeight />

<Section>
  <div class="w-full flex items-center justify-between">
    <SectionHeading icon={list} />
    {#if $payments$}
      <FilterSort
        quickLoad
        items={$payments$}
        bind:filters
        bind:tagFilters
        bind:sorters
        bind:processed
      />
    {/if}
  </div>

  <div class="w-full overflow-hidden flex">
    {#if !$payments$}
      <div in:fade={{ duration: 250 }} class="mt-4 w-full flex justify-center">
        <Spinner />
      </div>
    {:else if !$payments$.length}
      <div class="mt-4 mb-2 w-full">
        <Msg type="info" closable={false} message={$translate('app.labels.no_payments')} />
      </div>
    {:else}
      <div
        bind:this={transactionsContainer}
        in:fade={{ duration: 250 }}
        class="w-full flex flex-col overflow-hidden gap-y-2 rounded mt-2"
      >
        <VirtualList
          bind:this={virtualList}
          on:afterScroll={e => handleTransactionsScroll(e.detail.offset)}
          width="100%"
          height={listHeight}
          itemCount={dailyPaymentChunks.length}
          itemSize={getDaySize}
          getKey={index => dailyPaymentChunks[index][0]}
        >
          <div slot="item" let:index let:style {style}>
            <div class="pt-1 pl-1">
              <DayDate date={dailyPaymentChunks[index][0]} />
              <div class="rounded overflow-hidden">
                <div class="overflow-hidden rounded">
                  {#each inPlaceSort(dailyPaymentChunks[index][1]).desc(({ timestamp }) => timestamp) as payment (`${payment.id}`)}
                    {#await getSummary(payment) then { summary, formattedTimestamp }}
                      <PaymentRow {payment} {summary} {formattedTimestamp} />
                    {/await}
                  {/each}
                </div>
              </div>
            </div>
          </div>
        </VirtualList>
      </div>
    {/if}
  </div>

  <div class="w-full flex justify-end">
    <a
      href="/transactions/receive"
      class:absolute={transactionsContainerScrollable}
      class:px-2={transactionsContainerScrollable}
      class:px-4={!transactionsContainerScrollable || showFullReceiveButton}
      class="bottom-2 right-2 no-underline flex items-center rounded-full bg-neutral-900 border-2 border-neutral-50 py-2 hover:shadow-lg hover:shadow-neutral-50 mt-4 w-min hover:bg-neutral-800 relative"
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
