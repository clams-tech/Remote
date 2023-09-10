<script lang="ts">
  import { translate } from '$lib/i18n/translations'
  import lightningOutline from '$lib/icons/lightning-outline'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import { liveQuery } from 'dexie'
  import { db } from '$lib/db.js'
  import Spinner from '$lib/components/Spinner.svelte'
  import Msg from '$lib/components/Msg.svelte'
  import { fade } from 'svelte/transition'
  import VirtualList from 'svelte-tiny-virtual-list'
  import ForwardRow from './ForwardRow.svelte'
  import forward from '$lib/icons/forward.js'

  const forwards$ = liveQuery(() => db.forwards.toArray())

  let showFullOpenButton = false
  let forwardsContainer: HTMLDivElement

  // need to adjust this if you change the transaction row height
  const rowSize = 80

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
</script>

<svelte:head>
  <title>
    {$translate('app.routes./forwards.title')}
  </title>
</svelte:head>

<svelte:window bind:innerHeight />

<Section>
  <SectionHeading icon={forward} />

  <div class="w-full overflow-hidden flex flex-grow">
    {#if !$forwards$}
      <div in:fade class="mt-4">
        <Spinner />
      </div>
    {:else if !$forwards$.length}
      <div class="w-full mt-4">
        <Msg message={$translate('app.labels.no_forwards')} type="info" />
      </div>
    {:else}
      <div
        bind:this={forwardsContainer}
        class="w-full flex flex-col flex-grow overflow-hidden gap-y-2 mt-2"
      >
        <VirtualList
          on:afterScroll={(e) => handleForwardsScroll(e.detail.offset)}
          width="100%"
          height={listHeight}
          itemCount={$forwards$.length}
          itemSize={rowSize}
          getKey={(index) => $forwards$[index].id}
        >
          <div slot="item" let:index let:style {style}>
            <ForwardRow forward={$forwards$[index]} />
          </div>
        </VirtualList>
      </div>
    {/if}
  </div>
</Section>
