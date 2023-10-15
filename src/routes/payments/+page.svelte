<script lang="ts">
  import { db } from '$lib/db/index.js'
  import Msg from '$lib/components/Msg.svelte'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import Spinner from '$lib/components/Spinner.svelte'
  import list from '$lib/icons/list.js'
  import PaymentRow from './PaymentRow.svelte'
  import { fade, slide } from 'svelte/transition'
  import { formatDate } from '$lib/dates.js'
  import plus from '$lib/icons/plus.js'
  import { translate } from '$lib/i18n/translations.js'
  import VirtualList from 'svelte-tiny-virtual-list'
  import { filter, firstValueFrom, map } from 'rxjs'
  import { connections$, wallets$ } from '$lib/streams.js'
  import FilterSort from '$lib/components/FilterSort.svelte'
  import type { Filter, Sorter, TagFilter } from '$lib/@types/common.js'
  import { getAllTags } from '$lib/db/helpers.js'
  import { appWorker, appWorkerMessages$ } from '$lib/worker.js'
  import { createRandomHex } from '$lib/crypto.js'
  import SyncRouteData from '$lib/components/SyncRouteData.svelte'
  import { fetchInvoices, fetchTransactions } from '$lib/wallets/index.js'
  import type { Payment } from '$lib/@types/payments.js'

  let payments: Payment[] = []
  let filters: Filter[] = []
  let tagFilters: TagFilter[] = []

  let sorters: Sorter[] = [
    { label: $translate('app.labels.date'), key: 'timestamp', direction: 'desc' }
  ]

  getAllTags().then(tags => {
    const walletFilter = {
      label: $translate('app.labels.wallet'),
      values: wallets$.value.reduce((acc, wallet) => {
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

    tagFilters = tags.map(tag => ({ tag, checked: false }))

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
    const payments = dailyPaymentChunks[index][1]
    return payments.length * rowSize + 24 + 8
  }

  let innerHeight: number

  $: maxHeight = innerHeight - 80 - 56 - 24

  $: fullHeight = dailyPaymentChunks
    ? dailyPaymentChunks.reduce((acc, data) => acc + data[1].length * rowSize + 24 + 8, 0)
    : 0

  $: listHeight = Math.min(maxHeight, fullHeight)
  $: transactionsContainerScrollable = processing
    ? false
    : dailyPaymentChunks
    ? fullHeight > listHeight
    : false

  let virtualList: VirtualList

  $: if (processed && dailyPaymentChunks) {
    setTimeout(() => virtualList && virtualList.recomputeSizes(0), 25)
  }

  const syncPayments = async () => {
    await Promise.all(
      connections$.value.map(connection =>
        Promise.all([fetchInvoices(connection), fetchTransactions(connection)])
      )
    )
  }

  let processing: boolean
</script>

<svelte:window bind:innerHeight />

<Section>
  <div class="w-full flex items-center justify-between">
    <SectionHeading icon={list} />
    {#if $payments$}
      <div class="flex items-center gap-x-2">
        <SyncRouteData sync={syncPayments} />
        <FilterSort
          items={$payments$}
          bind:filters
          bind:tagFilters
          bind:sorters
          bind:processed
          bind:processing
        />
      </div>
    {/if}
  </div>

  <div class="w-full overflow-hidden flex">
    {#if !$payments$ || processing}
      <div in:fade={{ duration: 250 }} class="my-4 w-full flex justify-center">
        <Spinner />
      </div>
    {:else if !$payments$.length}
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
          itemCount={dailyPaymentChunks.length}
          itemSize={getDaySize}
          getKey={index => dailyPaymentChunks[index][0]}
        >
          <div slot="item" let:index let:style {style}>
            <div class="pt-1 pl-1">
              <div
                class="text-xs font-semibold sticky top-1 mb-1 py-1 px-3 rounded bg-neutral-900 w-min whitespace-nowrap shadow shadow-neutral-700/50"
              >
                {dailyPaymentChunks[index][0]}
              </div>
              <div class="rounded overflow-hidden">
                <div class="overflow-hidden rounded">
                  <VirtualList
                    width="100%"
                    height={Math.min(dailyPaymentChunks[index][1].length * rowSize, maxHeight - 32)}
                    itemCount={dailyPaymentChunks[index][1].length}
                    itemSize={rowSize}
                    getKey={innerIndex => dailyPaymentChunks[index][1][innerIndex].id}
                  >
                    <div slot="item" let:index={innerIndex} let:style {style}>
                      {@const payment = dailyPaymentChunks[index][1][innerIndex]}
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
