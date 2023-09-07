<script lang="ts">
  import { translate } from '$lib/i18n/translations'
  import lightningOutline from '$lib/icons/lightning-outline'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import { liveQuery } from 'dexie'
  import { db } from '$lib/db.js'
  import Spinner from '$lib/components/Spinner.svelte'
  import Msg from '$lib/components/Msg.svelte'
  import { fade, slide } from 'svelte/transition'
  import VirtualList from 'svelte-tiny-virtual-list'
  import plus from '$lib/icons/plus.js'
  import OfferRow from './OfferRow.svelte'

  const offers$ = liveQuery(() => db.offers.toArray())

  let showFullOpenButton = false
  let offersContainer: HTMLDivElement

  $: offersContainerScrollable =
    $offers$ && offersContainer ? $offers$.length * 74 > offersContainer.clientHeight : false

  let previousOffset = 0

  const handleOffersScroll = (offset: number) => {
    if (offset < previousOffset) {
      showFullOpenButton = true
    } else {
      showFullOpenButton = false
    }

    previousOffset = offset
  }

  let innerHeight: number

  // need to adjust this if you change the transaction row height
  const rowSize = 102

  $: maxHeight = innerHeight - 147 - 56 - 24 - 80
  $: fullHeight = $offers$ ? $offers$.length * rowSize : 0
  $: listHeight = Math.min(maxHeight, fullHeight)
</script>

<svelte:head>
  <title>
    {$translate('app.routes./offers.title')}
  </title>
</svelte:head>

<svelte:window bind:innerHeight />

<Section>
  <SectionHeading icon={lightningOutline} />

  <div class="w-full overflow-hidden flex flex-grow">
    {#if !$offers$}
      <div in:fade class="mt-4">
        <Spinner />
      </div>
    {:else if !$offers$.length}
      <div class="w-full mt-4">
        <Msg message={$translate('app.labels.no_offers')} type="info" />
      </div>
    {:else}
      <div
        bind:this={offersContainer}
        class="w-full flex flex-col flex-grow overflow-hidden gap-y-2 mt-2"
      >
        <VirtualList
          on:afterScroll={(e) => handleOffersScroll(e.detail.offset)}
          width="100%"
          height={listHeight}
          itemCount={$offers$.length}
          itemSize={rowSize}
          getKey={(index) => $offers$[index].id}
        >
          <div slot="item" let:index let:style {style}>
            <OfferRow offer={$offers$[index]} />
          </div>
        </VirtualList>
      </div>
    {/if}
  </div>

  <div class="w-full flex justify-end">
    <a
      href="/offers/offer/create"
      class:absolute={offersContainerScrollable}
      class:px-2={offersContainerScrollable}
      class:px-4={!offersContainerScrollable || showFullOpenButton}
      class="bottom-2 right-2 no-underline flex items-center rounded-full bg-neutral-900 py-2 shadow shadow-neutral-50 mt-4 w-min hover:bg-neutral-800"
      on:mouseenter={() => offersContainerScrollable && (showFullOpenButton = true)}
      on:mouseleave={() => offersContainerScrollable && (showFullOpenButton = false)}
    >
      <div class="w-6 -ml-1">{@html plus}</div>

      {#if !offersContainerScrollable || showFullOpenButton}
        <div class="font-semibold" in:slide|local={{ axis: 'x' }}>
          {$translate('app.labels.create')}
        </div>
      {/if}
    </a>
  </div>
</Section>
