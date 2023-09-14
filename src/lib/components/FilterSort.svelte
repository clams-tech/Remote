<script lang="ts">
  import { translate } from '$lib/i18n/translations.js'
  import type { Metadata } from '$lib/@types/metadata.js'
  import { db } from '$lib/db.js'
  import filter from '$lib/icons/filter.js'
  import { inPlaceSort } from 'fast-sort'
  import Modal from './Modal.svelte'
  import Toggle from './Toggle.svelte'

  type T = $$Generic

  type Filter = {
    label: string
    key: string
    predicate: (val: T[keyof T]) => boolean
    applied: boolean
  }

  type TagFilter = { tag: string; applied: boolean }
  type Sorter = { label: string; key: keyof T; direction: 'asc' | 'desc'; applied: boolean }

  export let items: T[]
  export let filters: Filter[]
  export let tagFilters: TagFilter[]
  export let sorters: Sorter[]
  export let processed: T[]

  const cachedMetadata: Partial<Record<string, Metadata | null>> = {}

  let showModal = false

  const filterSort = async () => {
    console.log('filtering and sorting')
    let processedItems: T[] = []

    console.log({ filters })

    // FILTER
    for (const item of items) {
      const id = item['id' as keyof T] as string

      let metadata: Metadata | null | undefined = cachedMetadata[id]

      // not yet cached
      if (typeof metadata === 'undefined') {
        metadata = await db.metadata.get(id)
        cachedMetadata[id] = metadata || null
      }

      const passesAllFilters = !!filters.every(({ key, predicate, applied }) =>
        applied ? predicate(item[key as keyof T]) : true
      )

      const passesAllTagFilters = !!tagFilters.every(({ tag, applied }) =>
        applied && metadata ? metadata.tags.includes(tag) : true
      )

      if (passesAllFilters && passesAllTagFilters) {
        processedItems.push(item)
      }
    }

    const appliedSorter = sorters.find(({ applied }) => applied)

    // SORT
    if (appliedSorter) {
      inPlaceSort(processedItems)[appliedSorter.direction]((i) => i[appliedSorter.key])
    }

    processed = processedItems

    console.log({ processed })
  }

  // recalculate on change
  $: if (filters && tagFilters && sorters) {
    filterSort()
  }

  const toggleFilter = (key: Filter['key']) => {
    filters = filters.map((filter) => {
      if (filter.key === key) {
        filter.applied = !filter.applied
      }

      return filter
    })
  }
</script>

<button on:click={() => (showModal = true)} class="w-[2em]">{@html filter}</button>

{#if showModal}
  <Modal on:close={() => (showModal = false)}>
    <div class="h-full overflow-auto w-full">
      <div class="font-semibold mb-2">{$translate('app.labels.filters')}</div>

      <div class="w-full">
        {#each filters as { label, applied, key }}
          <Toggle on:change={() => toggleFilter(key)} toggled={applied}>
            <div slot="left" class="mr-2">{label}</div>
          </Toggle>
        {/each}
      </div>
    </div>
  </Modal>
{/if}
