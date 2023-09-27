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
  import { filter, from, takeUntil } from 'rxjs'
  import { onDestroy$ } from '$lib/streams.js'
  import FilterSort from '$lib/components/FilterSort.svelte'
  import type { Filter, Sorter, TagFilter } from '$lib/@types/common.js'

  const forwards$ = from(liveQuery(() => db.forwards.toArray()))

  let showFullOpenButton = false
  let forwardsContainer: HTMLDivElement

  // need to adjust this if you change the transaction row height
  const rowSize = 82

  let previousOffset = 0

  const handleForwardsScroll = (offset: number) => {
    if (offset < previousOffset) {
      showFullOpenButton = true
    } else {
      showFullOpenButton = false
    }

    previousOffset = offset
  }

  let innerHeight: number

  $: maxHeight = innerHeight - 147 - 56 - 24 - 80
  $: fullHeight = $forwards$ ? $forwards$.length * rowSize : 0
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
              checked: true,
              predicate: {
                key: 'status',
                values: ['settled']
              }
            },
            {
              label: $translate('app.labels.offered'),
              checked: true,
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

  $: if (virtualList && processed) {
    setTimeout(() => virtualList.recomputeSizes(0), 25)
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
    {:else}
      <div
        bind:this={forwardsContainer}
        class="w-full flex flex-col flex-grow overflow-hidden gap-y-2 mt-2"
      >
        <VirtualList
          bind:this={virtualList}
          on:afterScroll={e => handleForwardsScroll(e.detail.offset)}
          width="100%"
          height={listHeight}
          itemCount={processed.length}
          itemSize={rowSize}
          getKey={index => processed[index].id}
        >
          <div slot="item" let:index let:style {style}>
            <ForwardRow forward={processed[index]} />
          </div>
        </VirtualList>
      </div>
    {/if}
  </div>
</Section>
