<script lang="ts">
  import Spinner from '$lib/elements/Spinner.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import channels from '$lib/icons/channels.js'
  import plus from '$lib/icons/plus.js'
  import Big from 'big.js'
  import ChannelRow from './components/ChannelRow.svelte'
  import SummaryRow from '$lib/elements/SummaryRow.svelte'
  import { liveQuery } from 'dexie'
  import { db } from '$lib/db.js'
  import Msg from '$lib/elements/Msg.svelte'
  import BitcoinAmount from '$lib/elements/BitcoinAmount.svelte'
  import Section from '$lib/elements/Section.svelte'
  import SectionHeading from '$lib/elements/SectionHeading.svelte'
  import filter from '$lib/icons/filter.js'
  import { fade, slide } from 'svelte/transition'
  import debounce from 'lodash.debounce'

  const channels$ = liveQuery(() => db.channels.toArray())

  $: totalMsat =
    $channels$ &&
    $channels$.reduce(
      (acc, { balanceLocal, reserveLocal, balanceRemote, reserveRemote }) => {
        acc.sendable = Big(acc.sendable).add(balanceLocal).minus(reserveLocal).toString()
        acc.receivable = Big(acc.receivable).add(balanceRemote).minus(reserveRemote).toString()

        return acc
      },
      { sendable: '0', receivable: '0' }
    )

  let showFilters = false
  const toggleFilters = () => (showFilters = !showFilters)

  let showFullOpenButton = false
  let channelsContainer: HTMLDivElement
  let channelsContainerScrollable = false
  let innerHeight: number

  $: if (innerHeight && channelsContainer) {
    calculateScrollable(channelsContainer)
  }

  const calculateScrollable = debounce((channelsContainer: HTMLDivElement) => {
    if (channelsContainer.scrollHeight > channelsContainer.clientHeight) {
      channelsContainerScrollable = true
    } else {
      channelsContainerScrollable = false
    }
  }, 500)

  let prevChannelsScrollY: number = 0

  const handleTransactionsScroll = () => {
    if (channelsContainer) {
      if (channelsContainer.scrollTop < prevChannelsScrollY) {
        showFullOpenButton = true
      } else {
        showFullOpenButton = false
      }

      prevChannelsScrollY = channelsContainer.scrollTop
    }
  }
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
      <div class="mt-4">
        <Msg type="info" message={$translate('app.labels.no_channels')} />
      </div>
    {:else}
      <div class="w-full flex flex-col h-full overflow-hidden">
        <div class="w-full mb-4">
          <SummaryRow>
            <div slot="label">Channels:</div>
            <div slot="value">{$channels$.length}</div>
          </SummaryRow>

          <SummaryRow>
            <div slot="label">{$translate('app.labels.sendable')}:</div>
            <div slot="value">
              <BitcoinAmount msat={totalMsat.sendable} />
            </div>
          </SummaryRow>

          <SummaryRow>
            <div slot="label">{$translate('app.labels.receivable')}:</div>
            <div slot="value">
              <BitcoinAmount msat={totalMsat.receivable} />
            </div>
          </SummaryRow>
        </div>

        <div
          bind:this={channelsContainer}
          on:scroll={debounce(handleTransactionsScroll, 100)}
          class="w-full flex flex-col flex-grow overflow-auto gap-y-2 relative"
        >
          <div class="flex flex-col h-full overflow-hidden">
            <div class="w-full flex flex-col h-full gap-y-4 overflow-auto">
              {#each $channels$ as channel}
                <ChannelRow {channel} />
              {/each}
            </div>
          </div>
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
      class="bottom-2 right-2 no-underline flex items-center rounded-full bg-neutral-900 py-2 shadow shadow-neutral-50 mt-4 w-min hover:bg-neutral-800"
      on:mouseenter={() => channelsContainerScrollable && (showFullOpenButton = true)}
      on:mouseleave={() => channelsContainerScrollable && (showFullOpenButton = false)}
    >
      <div class="w-6">{@html plus}</div>

      {#if !channelsContainerScrollable || showFullOpenButton}
        <div class="ml-1 font-semibold" in:slide|local={{ axis: 'x' }}>
          {$translate('app.labels.open')}
        </div>
      {/if}
    </a>
  </div>
</Section>
