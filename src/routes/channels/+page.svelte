<script lang="ts">
  import Spinner from '$lib/components/Spinner.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import channels from '$lib/icons/channels.js'
  import plus from '$lib/icons/plus.js'
  import ChannelRow from './ChannelRow.svelte'
  import SummaryRow from '$lib/components/SummaryRow.svelte'
  import { liveQuery } from 'dexie'
  import { db } from '$lib/db.js'
  import Msg from '$lib/components/Msg.svelte'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import filter from '$lib/icons/filter.js'
  import { fade, slide } from 'svelte/transition'
  import VirtualList from 'svelte-tiny-virtual-list'

  const channels$ = liveQuery(() => db.channels.toArray())

  $: totalSats =
    $channels$ &&
    $channels$.reduce(
      (acc, { balanceLocal, reserveLocal, balanceRemote, reserveRemote, status }) => {
        if (status === 'active') {
          acc.sendable = acc.sendable + balanceLocal - reserveLocal
          acc.receivable = acc.receivable + balanceRemote - reserveRemote
        }

        return acc
      },
      { sendable: 0, receivable: 0 }
    )

  let showFilters = false
  const toggleFilters = () => (showFilters = !showFilters)

  let showFullOpenButton = false
  let channelsContainer: HTMLDivElement

  $: channelsContainerScrollable =
    $channels$ && channelsContainer
      ? $channels$.length * 74 > channelsContainer.clientHeight
      : false

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

  $: maxHeight = innerHeight - 147 - 56 - 24 - 80
  $: fullHeight = $channels$ ? $channels$.length * 84 : 0
  $: listHeight = Math.min(maxHeight, fullHeight)
</script>

<svelte:window bind:innerHeight />

<Section>
  <div class="flex items-center justify-between w-full">
    <SectionHeading icon={channels} />
    <button on:click={toggleFilters} class="w-8">{@html filter}</button>
  </div>

  {#if showFilters}
    <!-- @TODO -->
  {/if}

  <div class="w-full overflow-hidden flex flex-grow">
    {#if !$channels$}
      <div in:fade={{ duration: 250 }} class="mt-4 w-full flex justify-center">
        <Spinner />
      </div>
    {:else if !$channels$.length}
      <div class="mt-4 w-full">
        <Msg type="info" closable={false} message={$translate('app.labels.no_channels')} />
      </div>
    {:else}
      <div class="w-full flex flex-col h-full overflow-hidden">
        <div class="w-full mb-2">
          <SummaryRow>
            <div slot="label">{$translate('app.labels.total')}:</div>
            <div slot="value">{$channels$.length} channels</div>
          </SummaryRow>

          <SummaryRow>
            <div slot="label">{$translate('app.labels.sendable')}:</div>
            <div slot="value">
              <BitcoinAmount sats={totalSats.sendable} />
            </div>
          </SummaryRow>

          <SummaryRow>
            <div slot="label">{$translate('app.labels.receivable')}:</div>
            <div slot="value">
              <BitcoinAmount sats={totalSats.receivable} />
            </div>
          </SummaryRow>
        </div>

        <div
          bind:this={channelsContainer}
          class="w-full flex flex-col flex-grow overflow-hidden gap-y-2"
        >
          <VirtualList
            on:afterScroll={(e) => handleChannelsScroll(e.detail.offset)}
            width="100%"
            height={listHeight}
            itemCount={$channels$.length}
            itemSize={84}
            getKey={(index) => $channels$[index].id}
          >
            <div slot="item" let:index let:style {style}>
              <ChannelRow channel={$channels$[index]} />
            </div>
          </VirtualList>
        </div>
      </div>
    {/if}
  </div>

  <div class="w-full flex justify-end">
    <a
      href="/channels/open"
      class:absolute={channelsContainerScrollable}
      class:px-2={channelsContainerScrollable}
      class:px-4={!channelsContainerScrollable || showFullOpenButton}
      class="bottom-2 right-2 no-underline flex items-center rounded-full bg-neutral-900 border-2 border-neutral-50 py-2 hover:shadow-lg hover:shadow-neutral-50 relative mt-4 w-min hover:bg-neutral-800"
      on:mouseenter={() => channelsContainerScrollable && (showFullOpenButton = true)}
      on:mouseleave={() => channelsContainerScrollable && (showFullOpenButton = false)}
    >
      <div class="absolute top-0 right-0 w-full h-full rounded-full overflow-hidden opacity-70">
        <img src="/images/shell1.png" class="h-full w-full" alt="texture" />
      </div>

      <div class="w-6 -ml-1 relative">{@html plus}</div>

      {#if !channelsContainerScrollable || showFullOpenButton}
        <div class="font-semibold relative" in:slide|local={{ axis: 'x' }}>
          {$translate('app.labels.open')}
        </div>
      {/if}
    </a>
  </div>
</Section>
