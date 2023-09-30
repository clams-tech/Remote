<script lang="ts">
  import Spinner from '$lib/components/Spinner.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import channels from '$lib/icons/channels.js'
  import plus from '$lib/icons/plus.js'
  import ChannelRow from './ChannelRow.svelte'
  import SummaryRow from '$lib/components/SummaryRow.svelte'
  import { liveQuery } from 'dexie'
  import { db } from '$lib/db/index.js'
  import Msg from '$lib/components/Msg.svelte'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import { fade, slide } from 'svelte/transition'
  import VirtualList from 'svelte-tiny-virtual-list'
  import { filter, from, takeUntil } from 'rxjs'
  import type { Channel } from '$lib/@types/channels.js'
  import { onDestroy$ } from '$lib/streams.js'
  import FilterSort from '$lib/components/FilterSort.svelte'
  import type { Filter, Sorter, TagFilter } from '$lib/@types/common.js'

  const channels$ = from(
    liveQuery(() =>
      db.channels.toArray().then(channels =>
        Array.from(
          channels
            .reduce((acc, channel) => {
              const channelWithSameId = acc.get(channel.id)

              // if duplicates (we are both parties to channel), keep the local opener copy
              if (!channelWithSameId || channelWithSameId.opener !== 'local') {
                acc.set(channel.id, channel)
              }

              return acc
            }, new Map<string, Channel>())
            .values()
        )
      )
    )
  )

  $: totals =
    $channels$ &&
    $channels$.reduce(
      (acc, { balanceLocal, reserveLocal, balanceRemote, reserveRemote, status }) => {
        if (status === 'active') {
          acc.sendable = acc.sendable + balanceLocal - reserveLocal
          acc.receivable = acc.receivable + balanceRemote - reserveRemote
        }

        if (status !== 'closed' && status !== 'force_closed') {
          acc.channels += 1
        }

        return acc
      },
      { sendable: 0, receivable: 0, channels: 0 }
    )

  let showFullOpenButton = false
  let channelsContainer: HTMLDivElement

  let previousOffset = 0

  const handleChannelsScroll = (offset: number) => {
    if (offset < previousOffset) {
      showFullOpenButton = true
    } else {
      showFullOpenButton = false
    }

    previousOffset = offset
  }

  let innerHeight: number
  let rowSize = 84

  $: maxHeight = innerHeight - 147 - 56 - 24 - 80
  $: fullHeight = processed ? processed.length * rowSize : 0
  $: listHeight = Math.min(maxHeight, fullHeight)
  $: channelsContainerScrollable = processed ? processed.length * rowSize > listHeight : false

  let processed: Channel[] = []
  let filters: Filter[] = []
  let tagFilters: TagFilter[] = []

  let sorters: Sorter[] = [
    { label: $translate('app.labels.local_balance'), key: 'balanceLocal', direction: 'desc' },
    { label: $translate('app.labels.remote_balance'), key: 'balanceRemote', direction: 'desc' }
  ]

  // once we have offers, create filters, tag filters
  channels$
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
                key: 'status',
                values: ['active']
              }
            },
            {
              label: $translate('app.labels.opening'),
              checked: false,
              predicate: {
                key: 'status',
                values: ['opening']
              }
            },
            {
              label: $translate('app.labels.closing'),
              checked: false,
              predicate: {
                key: 'status',
                values: ['closing']
              }
            },
            {
              label: $translate('app.labels.closed'),
              checked: false,
              predicate: {
                key: 'status',
                values: ['closed']
              }
            },
            {
              label: $translate('app.labels.force_closed'),
              checked: false,
              predicate: {
                key: 'status',
                values: ['force_closed']
              }
            }
          ]
        },
        walletFilter
      ]
    })

  let virtualList: VirtualList

  $: if (virtualList && processed.length) {
    setTimeout(() => virtualList.recomputeSizes(0), 25)
  }
</script>

<svelte:window bind:innerHeight />

<Section>
  <div class="flex items-center justify-between w-full">
    <SectionHeading icon={channels} />
    {#if $channels$}
      <FilterSort items={$channels$} bind:filters bind:tagFilters bind:sorters bind:processed />
    {/if}
  </div>

  <div class="w-full overflow-hidden flex flex-grow">
    {#if !$channels$}
      <div in:fade={{ duration: 250 }} class="mt-4 w-full flex justify-center">
        <Spinner />
      </div>
    {:else if !$channels$.length}
      <div class="mt-4 w-full">
        <Msg type="info" closable={false} message={$translate('app.labels.no_channels')} />
      </div>
    {:else if processed.length}
      <div class="w-full flex flex-col h-full overflow-hidden">
        <div class="w-full mb-2">
          <SummaryRow>
            <div slot="label">{$translate('app.labels.active')}:</div>
            <div slot="value">{totals.channels} channels</div>
          </SummaryRow>

          <SummaryRow>
            <div slot="label">{$translate('app.labels.sendable')}:</div>
            <div slot="value">
              <BitcoinAmount sats={totals.sendable < 0 ? 0 : totals.sendable} />
            </div>
          </SummaryRow>

          <SummaryRow>
            <div slot="label">{$translate('app.labels.receivable')}:</div>
            <div slot="value">
              <BitcoinAmount sats={totals.receivable < 0 ? 0 : totals.receivable} />
            </div>
          </SummaryRow>
        </div>

        <div
          bind:this={channelsContainer}
          class="w-full flex flex-col flex-grow overflow-hidden gap-y-2"
        >
          <VirtualList
            bind:this={virtualList}
            on:afterScroll={e => handleChannelsScroll(e.detail.offset)}
            width="100%"
            height={listHeight}
            itemCount={processed.length}
            itemSize={rowSize}
            getKey={index => processed[index].id}
          >
            <div slot="item" let:index let:style {style}>
              {@const channel = processed[index]}
              <ChannelRow {channel} />
            </div>
          </VirtualList>
        </div>
      </div>
    {/if}
  </div>

  <div class="w-full flex justify-end mt-2">
    <a
      href="/channels/open"
      class:absolute={channelsContainerScrollable}
      class:px-2={channelsContainerScrollable}
      class:px-4={!channelsContainerScrollable || showFullOpenButton}
      class="bottom-2 right- no-underline flex items-center rounded-full bg-neutral-900 border-2 border-neutral-50 py-2 hover:shadow-lg hover:shadow-neutral-50 relative mt-4 w-min hover:bg-neutral-800"
      on:mouseenter={() => channelsContainerScrollable && (showFullOpenButton = true)}
      on:mouseleave={() => channelsContainerScrollable && (showFullOpenButton = false)}
    >
      <div class="absolute top-0 right-0 w-full h-full rounded-full overflow-hidden opacity-70">
        <img src="/images/shell1.png" class="h-full w-full" alt="texture" />
      </div>

      <div class="w-6 relative" class:-ml-1={!channelsContainerScrollable || showFullOpenButton}>
        {@html plus}
      </div>

      {#if !channelsContainerScrollable || showFullOpenButton}
        <div class="font-semibold relative" in:slide|local={{ axis: 'x' }}>
          {$translate('app.labels.open')}
        </div>
      {/if}
    </a>
  </div>
</Section>
