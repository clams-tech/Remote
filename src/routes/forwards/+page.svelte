<script lang="ts">
  import { translate } from '$lib/i18n/translations'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import { liveQuery } from 'dexie'
  import { db } from '$lib/db/index.js'
  import Spinner from '$lib/components/Spinner.svelte'
  import Msg from '$lib/components/Msg.svelte'
  import { fade } from 'svelte/transition'
  import VirtualList from 'svelte-tiny-virtual-list'
  import ForwardRow from './ForwardRow.svelte'
  import forward from '$lib/icons/forward.js'
  import type { Forward } from '$lib/@types/forwards.js'
  import { filter, firstValueFrom, from, map, takeUntil } from 'rxjs'
  import { onDestroy$ } from '$lib/streams.js'
  import FilterSort from '$lib/components/FilterSort.svelte'
  import type { Filter, Sorter, TagFilter } from '$lib/@types/common.js'
  import { createRandomHex } from '$lib/crypto.js'
  import { appWorker, appWorkerMessages$ } from '$lib/worker.js'

  const forwards$ = from(liveQuery(() => db.forwards.toArray()))

  let forwardsContainer: HTMLDivElement

  // need to adjust this if you change the forward row height
  const rowSize = 82

  let innerHeight: number

  $: maxHeight = innerHeight - 80 - 56 - 24
  $: fullHeight = $forwards$ ? $forwards$.length * rowSize + 24 + 8 : 0
  $: listHeight = Math.min(maxHeight, fullHeight)

  let processed: Forward[] = []
  let filters: Filter[] = []
  let tagFilters: TagFilter[] = []

  let sorters: Sorter[] = [
    { label: $translate('app.labels.date'), key: 'completedAt', direction: 'desc' },
    { label: $translate('app.labels.fee'), key: 'fee', direction: 'desc' },
    { label: $translate('app.labels.in'), key: 'in', direction: 'desc' },
    { label: $translate('app.labels.out'), key: 'out', direction: 'desc' }
  ]

  // once we have offers, create filters, tag filters
  forwards$
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
              label: $translate('app.labels.settled'),
              checked: false,
              predicate: {
                key: 'status',
                values: ['settled']
              }
            },
            {
              label: $translate('app.labels.offered'),
              checked: false,
              predicate: {
                key: 'status',
                values: ['offered']
              }
            },
            {
              label: $translate('app.labels.failed'),
              checked: false,
              predicate: {
                key: 'status',
                values: ['failed']
              }
            },
            {
              label: $translate('app.labels.local_failed'),
              checked: false,
              predicate: {
                key: 'status',
                values: ['local_failed']
              }
            }
          ]
        },
        walletFilter
      ]
    })

  let virtualList: VirtualList

  $: if (virtualList && processed && dailyForwardChunks) {
    setTimeout(() => virtualList.recomputeSizes(0), 25)
  }

  type ForwardChunks = [number, Forward[]][]
  let dailyForwardChunks: ForwardChunks = []

  const sortDailyChunks = async () => {
    const id = createRandomHex()

    appWorker.postMessage({
      id,
      type: 'sort-daily-forward-chunks',
      forwards: processed,
      direction: sorters[0].direction
    })

    dailyForwardChunks = (await firstValueFrom(
      appWorkerMessages$.pipe(
        filter(message => message.data.id === id),
        map(({ data }) => data.result)
      )
    )) as ForwardChunks
  }

  $: if (processed) {
    sortDailyChunks()
  }

  const getDaySize = (index: number) => {
    const forwards = dailyForwardChunks[index][1]
    return forwards.length * rowSize + 24 + 8
  }
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

    {#if $forwards$}
      <FilterSort items={$forwards$} bind:filters bind:tagFilters bind:sorters bind:processed />
    {/if}
  </div>

  <div class="w-full overflow-hidden flex flex-grow">
    {#if !$forwards$}
      <div in:fade class="mt-4">
        <Spinner />
      </div>
    {:else if !$forwards$.length}
      <div class="w-full mt-4">
        <Msg message={$translate('app.labels.no_forwards')} type="info" closable={false} />
      </div>
    {:else if dailyForwardChunks.length}
      <div
        bind:this={forwardsContainer}
        class="w-full flex flex-col flex-grow overflow-hidden gap-y-2 mt-2"
      >
        <VirtualList
          bind:this={virtualList}
          width="100%"
          height={listHeight}
          itemCount={dailyForwardChunks.length}
          itemSize={getDaySize}
          getKey={index => dailyForwardChunks[index][0]}
        >
          <div slot="item" let:index let:style {style}>
            <div class="pt-1 pl-1">
              <div
                class="text-xs font-semibold sticky top-1 mb-1 py-1 px-3 rounded bg-neutral-900 w-min whitespace-nowrap shadow shadow-neutral-700/50"
              >
                {dailyForwardChunks[index][0]}
              </div>
              <div class="rounded overflow-hidden">
                <div class="overflow-hidden rounded">
                  {#each dailyForwardChunks[index][1] as forward (`${forward.id}`)}
                    <ForwardRow {forward} />
                  {/each}
                </div>
              </div>
            </div>
          </div>
        </VirtualList>
      </div>
    {/if}
  </div>
</Section>
