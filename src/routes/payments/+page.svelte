<script lang="ts">
  import { db } from '$lib/db.js'
  import Msg from '$lib/components/Msg.svelte'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import Spinner from '$lib/components/Spinner.svelte'
  import list from '$lib/icons/list.js'
  import { liveQuery } from 'dexie'
  import PaymentRow from './PaymentRow.svelte'
  import { fade, slide } from 'svelte/transition'
  import { endOfDay } from 'date-fns'
  import { inPlaceSort } from 'fast-sort'
  import { formatDate } from '$lib/dates.js'
  import plus from '$lib/icons/plus.js'
  import { translate } from '$lib/i18n/translations.js'
  import VirtualList from 'svelte-tiny-virtual-list'
  import { from, takeUntil } from 'rxjs'
  import { onDestroy$ } from '$lib/streams.js'
  import uniqBy from 'lodash.uniqby'
  import FilterSort from '$lib/components/FilterSort.svelte'
  import type { Payment, PaymentStatus } from '$lib/@types/common.js'
  import { getNetwork } from '$lib/utils.js'
  import type { Invoice } from '$lib/@types/invoices.js'
  import type { Transaction } from '$lib/@types/transactions.js'
  import type { Address } from '$lib/@types/addresses.js'

  import {
    deriveAddressSummary,
    deriveInvoiceSummary,
    deriveTransactionSummary,
    enhanceInputsOutputs,
    type PaymentSummary
  } from '$lib/summary.js'

  const payments$ = from(
    liveQuery(() => {
      return db.transaction('r', db.invoices, db.transactions, db.addresses, async () => {
        const invoices = db.invoices
          .toArray()
          .then((invs) =>
            Array.from(
              invs
                .reduce((acc, inv) => {
                  const current = acc.get(inv.hash)

                  // if duplicates (we are both parties to invoice), keep the sender copy
                  if (!current || current.direction === 'receive') {
                    acc.set(inv.hash, inv)
                  }

                  return acc
                }, new Map<string, Invoice>())
                .values()
            )
          )
          .then((invs) =>
            invs.map((data) => {
              const { id, status, completedAt, createdAt, amount, request, fee, walletId, offer } =
                data
              return {
                id,
                type: 'invoice' as const,
                status,
                timestamp: completedAt || createdAt,
                walletId,
                amount,
                network: request ? getNetwork(request) : 'bitcoin',
                fee,
                offer: !!offer,
                data
              }
            })
          )

        const transactions = db.transactions
          .toArray()
          .then((txs) => uniqBy(txs, 'id'))
          .then((txs) =>
            txs.map((data) => {
              const { id, timestamp, blockheight, outputs, fee, walletId, channel } = data
              return {
                id,
                type: 'transaction' as const,
                status: (blockheight ? 'complete' : 'pending') as PaymentStatus,
                timestamp,
                walletId,
                network: getNetwork(outputs[0].address),
                fee,
                channel: !!channel,
                data
              }
            })
          )

        const addresses = db.addresses
          .filter(({ txid }) => !txid)
          .toArray()
          .then((addrs) =>
            addrs.map((data) => {
              const { id, createdAt, walletId, amount, value } = data
              return {
                id,
                type: 'address' as const,
                status: 'waiting' as PaymentStatus,
                timestamp: createdAt,
                walletId,
                amount,
                network: getNetwork(value),
                data
              }
            })
          )

        return Promise.all([invoices, transactions, addresses]).then((results) => results.flat())
      })
    })
  )

  type PaymentsMap = Map<number, Payment[]>

  type Key = keyof Payment

  type Filter = {
    label: string
    values: { label: string; checked: boolean; predicate: (val: Payment) => boolean }[]
  }

  type TagFilter = { tag: string; checked: boolean }
  type Sorter = { label: string; key: Key; direction: 'asc' | 'desc' }

  let processed: Payment[] = []
  let filters: Filter[] = []
  let tagFilters: TagFilter[] = []

  let sorters: Sorter[] = [
    { label: $translate('app.labels.date'), key: 'timestamp', direction: 'desc' }
  ]

  payments$.pipe(takeUntil(onDestroy$)).subscribe(async (payments) => {
    const walletIdSet = new Set()
    const tagSet = new Set()

    for (const { walletId, id } of payments) {
      walletIdSet.add(walletId)

      const metadata = await db.metadata.get(id)

      if (metadata) {
        metadata.tags.forEach((tag) => tagSet.add(tag))
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
            predicate: ({ walletId }) => walletId === wallet.id
          })
        }

        return acc
      }, [] as Filter['values'])
    }

    tagFilters = Array.from(tagSet.values()).map((tag) => ({ tag: tag as string, checked: true }))

    filters = [
      {
        label: $translate('app.labels.status'),
        values: [
          {
            label: $translate('app.labels.pending'),
            checked: false,
            predicate: ({ status }) => status === 'pending'
          },
          {
            label: $translate('app.labels.waiting'),
            checked: false,
            predicate: ({ status }) => status === 'waiting'
          },
          {
            label: $translate('app.labels.complete'),
            checked: false,
            predicate: ({ status }) => status === 'complete'
          },
          {
            label: $translate('app.labels.expired'),
            checked: false,
            predicate: ({ status }) => status === 'expired'
          },
          {
            label: $translate('app.labels.failed'),
            checked: false,
            predicate: ({ status }) => status === 'failed'
          }
        ]
      },
      {
        label: $translate('app.labels.type'),
        values: [
          {
            label: $translate('app.labels.lightning'),
            checked: false,
            predicate: ({ type }) => type === 'invoice'
          },
          {
            label: $translate('app.labels.onchain'),
            checked: false,
            predicate: ({ type }) => type === 'transaction' || type === 'address'
          },
          {
            label: $translate('app.labels.channel'),
            checked: false,
            predicate: ({ channel }) => !!channel
          },
          {
            label: $translate('app.labels.offer'),
            checked: false,
            predicate: ({ offer }) => !!offer
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
            predicate: ({ network }) => network === 'bitcoin'
          },
          {
            label: $translate('app.labels.regtest'),
            checked: false,
            predicate: ({ network }) => network === 'regtest'
          },
          {
            label: $translate('app.labels.testnet'),
            checked: false,
            predicate: ({ network }) => network === 'testnet'
          }
        ]
      }
    ]
  })

  type PaymentChunks = [number, Payment[]][]
  let dailyPaymentChunks: PaymentChunks = []

  const sortDailyChunks = () => {
    const map = processed.reduce((acc, payment) => {
      const date = new Date(payment.timestamp * 1000)
      const dateKey = endOfDay(date).getTime() / 1000
      acc.set(dateKey, [...(acc.get(dateKey) || []), payment])

      return acc
    }, new Map() as PaymentsMap)

    dailyPaymentChunks = inPlaceSort(Array.from(map.entries()))[sorters[0].direction](
      ([timestamp]) => timestamp
    )
  }

  $: if (processed) {
    sortDailyChunks()
  }

  let showFullReceiveButton = false
  let transactionsContainer: HTMLDivElement

  // need to adjust this if you change the transaction row height
  const rowSize = 88

  let previousOffset = 0

  const handleTransactionsScroll = (offset: number) => {
    if (offset < previousOffset) {
      showFullReceiveButton = true
    } else {
      showFullReceiveButton = false
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
  $: transactionsContainerScrollable = dailyPaymentChunks ? fullHeight > listHeight : false

  let virtualList: VirtualList

  $: if (filters && sorters && virtualList) {
    virtualList.recomputeSizes(0)
  }

  const summaryCache: Record<string, PaymentSummary> = {}

  const getSummary = async (payment: Payment): Promise<PaymentSummary> => {
    const cached = summaryCache[payment.id]

    if (cached) return cached

    if (payment.type === 'transaction') {
      const { inputs, outputs } = await enhanceInputsOutputs(payment.data as Transaction)
      const summary = await deriveTransactionSummary({
        inputs,
        outputs,
        fee: payment.fee,
        timestamp: payment.timestamp,
        channel: (payment.data as Transaction).channel
      })

      summaryCache[payment.id] = summary
      return summary
    } else if (payment.type === 'invoice') {
      const summary = await deriveInvoiceSummary(payment.data as Invoice)
      summaryCache[payment.id] = summary
      return summary
    } else {
      const summary = await deriveAddressSummary(payment.data as Address)
      summaryCache[payment.id] = summary
      return summary
    }
  }
</script>

<svelte:window bind:innerHeight />

<Section>
  <div class="w-full flex items-center justify-between">
    <SectionHeading icon={list} />
    {#if $payments$}
      <FilterSort items={$payments$} bind:filters bind:tagFilters bind:sorters bind:processed />
    {/if}
  </div>

  <div class="w-full overflow-hidden flex">
    {#if !$payments$}
      <div in:fade={{ duration: 250 }} class="mt-4 w-full flex justify-center">
        <Spinner />
      </div>
    {:else if !$payments$.length}
      <div class="mt-4 w-full">
        <Msg type="info" closable={false} message={$translate('app.labels.no_transactions')} />
      </div>
    {:else}
      <div
        bind:this={transactionsContainer}
        in:fade={{ duration: 250 }}
        class="w-full flex flex-col overflow-hidden gap-y-2 rounded"
      >
        <VirtualList
          bind:this={virtualList}
          on:afterScroll={(e) => handleTransactionsScroll(e.detail.offset)}
          width="100%"
          height={listHeight}
          itemCount={dailyPaymentChunks.length}
          itemSize={getDaySize}
          getKey={(index) => dailyPaymentChunks[index][0]}
        >
          <div slot="item" let:index let:style {style}>
            <div class="pt-1 pl-1">
              {#await formatDate(dailyPaymentChunks[index][0]) then formattedDate}
                <div
                  class="text-xs font-semibold sticky top-1 mb-1 py-1 px-3 rounded bg-neutral-900 w-min whitespace-nowrap shadow shadow-neutral-700/50"
                >
                  {formattedDate}
                </div>
              {/await}
              <div class="rounded overflow-hidden">
                <div class="overflow-hidden rounded">
                  {#each inPlaceSort(dailyPaymentChunks[index][1]).desc(({ timestamp }) => timestamp) as payment (`${payment.walletId}:${payment.id}:${payment.type}`)}
                    {#await getSummary(payment) then summary}
                      <PaymentRow {payment} {summary} />
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
