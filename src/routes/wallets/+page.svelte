<script lang="ts">
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import Spinner from '$lib/components/Spinner.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import plus from '$lib/icons/plus.js'
  import { connections$, onDestroy$, wallets$ } from '$lib/streams.js'
  import VirtualList from 'svelte-tiny-virtual-list'
  import WalletRow from './WalletRow.svelte'
  import FilterSort from '$lib/components/FilterSort.svelte'
  import { fade, slide } from 'svelte/transition'
  import Msg from '$lib/components/Msg.svelte'
  import wallet from '$lib/icons/wallet.js'
  import type { Wallet } from '$lib/@types/wallets.js'
  import type { Filter, Sorter, TagFilter } from '$lib/@types/common.js'
  import { filter, firstValueFrom, takeUntil } from 'rxjs'
  import { syncConnectionData, walletTypes } from '$lib/wallets/index.js'
  import { firstLetterUpperCase } from '$lib/utils.js'
  import refresh from '$lib/icons/refresh.js'
  import SyncRouteData from '$lib/components/SyncRouteData.svelte'

  let showFullAddButton = false
  let walletsContainer: HTMLDivElement

  let previousOffset = 0
  let direction: 'up' | 'down'
  let processingScroll = false

  const handleWalletsScroll = (offset: number) => {
    if (processingScroll) return

    if (offset + 10 < previousOffset) {
      processingScroll = true
      requestAnimationFrame(() => {
        if (direction === 'up') {
          showFullAddButton = true
        } else {
          direction = 'up'
        }
        processingScroll = false
      })
    } else if (offset > previousOffset) {
      processingScroll = true
      requestAnimationFrame(() => {
        if (direction === 'down') {
          showFullAddButton = false
        } else {
          direction = 'down'
        }
        processingScroll = false
      })
    }

    previousOffset = offset
  }

  let innerHeight: number
  let rowSize = 82.44

  $: maxHeight = innerHeight - 147 - 56 - 24 - 80
  $: fullHeight = processed ? processed.length * rowSize : 0
  $: listHeight = Math.min(maxHeight, fullHeight)
  $: walletsContainerScrollable = processed ? processed.length * rowSize > listHeight : false

  let processed: Wallet[] = []
  let tagFilters: TagFilter[] = []

  let filters: Filter[] = [
    {
      label: $translate('app.labels.type'),
      values: walletTypes.map(type => ({
        label: firstLetterUpperCase(type),
        checked: false,
        predicate: {
          key: 'type',
          values: [type]
        }
      }))
    }
  ]

  let sorters: Sorter[] = [
    { label: $translate('app.labels.created'), key: 'createdAt', direction: 'desc' },
    { label: $translate('app.labels.modified'), key: 'modifiedAt', direction: 'desc' },
    { label: $translate('app.labels.last_sync'), key: 'lastSync', direction: 'desc' }
  ]

  let virtualList: VirtualList

  $: if (virtualList && processed.length) {
    setTimeout(() => virtualList.recomputeSizes(0), 25)
  }

  const syncWallets = async () => {
    await Promise.all(
      $wallets$.map(async wallet => {
        const connection = connections$.value.find(connection => connection.walletId === wallet.id)
        console.log({ connection })

        if (connection) {
          await firstValueFrom(
            syncConnectionData(connection, wallet.lastSync || null).pipe(
              filter(progress => progress === 100)
            )
          )
        }
      })
    )
  }
</script>

<Section>
  <div class="flex items-center justify-between w-full">
    <SectionHeading icon={wallet} />
    {#if $wallets$}
      <div class="flex items-center gap-x-2">
        <SyncRouteData sync={syncWallets} />
        <FilterSort items={$wallets$} bind:filters bind:tagFilters bind:sorters bind:processed />
      </div>
    {/if}
  </div>

  <div class="w-full overflow-hidden flex flex-grow">
    {#if !$wallets$}
      <div in:fade={{ duration: 250 }} class="mt-4 w-full flex justify-center">
        <Spinner />
      </div>
    {:else if !$wallets$.length}
      <div class="mt-4 w-full">
        <Msg type="info" closable={false} message={$translate('app.labels.no_wallets')} />
      </div>
    {:else if processed.length}
      <div class="w-full flex flex-col h-full overflow-hidden">
        <div class="w-full mb-2">
          <!-- <SummaryRow>
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
          </SummaryRow> -->
        </div>

        <div
          bind:this={walletsContainer}
          class="w-full flex flex-col flex-grow overflow-hidden gap-y-2"
        >
          <VirtualList
            bind:this={virtualList}
            on:afterScroll={e => handleWalletsScroll(e.detail.offset)}
            width="100%"
            height={listHeight}
            itemCount={processed.length}
            itemSize={rowSize}
            getKey={index => processed[index].id}
          >
            <div slot="item" let:index let:style {style}>
              {@const wallet = processed[index]}
              <WalletRow {wallet} />
            </div>
          </VirtualList>
        </div>
      </div>
    {/if}
  </div>

  <div
    class="bottom-0 right-3 w-full flex justify-end mt-2"
    class:absolute={walletsContainerScrollable}
  >
    <a
      href="/channels/open"
      class:px-2={walletsContainerScrollable}
      class:px-4={!walletsContainerScrollable || showFullAddButton}
      class="no-underline flex items-center rounded-full bg-neutral-900 border-2 border-neutral-50 hover:shadow-lg hover:shadow-neutral-50 relative w-min hover:bg-neutral-800"
      on:mouseenter={() => walletsContainerScrollable && (showFullAddButton = true)}
      on:mouseleave={() => walletsContainerScrollable && (showFullAddButton = false)}
    >
      <div class="absolute top-0 right-0 w-full h-full rounded-full overflow-hidden opacity-70">
        <img src="/images/shell1.png" class="h-full w-full" alt="texture" />
      </div>

      <div class="w-6 relative py-2" class:-ml-1={!walletsContainerScrollable || showFullAddButton}>
        {@html plus}
      </div>

      {#if !walletsContainerScrollable || showFullAddButton}
        <div class="font-semibold relative" in:slide|local={{ axis: 'x' }}>
          {$translate('app.labels.add')}
        </div>
      {/if}
    </a>
  </div>
</Section>
