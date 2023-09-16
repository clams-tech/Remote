<script lang="ts">
  import debounce from 'lodash.debounce'

  import { translate } from '$lib/i18n/translations.js'
  import type { Metadata } from '$lib/@types/metadata.js'
  import { db } from '$lib/db.js'
  import filter from '$lib/icons/filter.js'
  import { inPlaceSort } from 'fast-sort'
  import Modal from './Modal.svelte'

  type T = $$Generic

  type Filter = {
    label: string
    values: { label: string; checked: boolean; predicate: (val: T) => boolean }[]
  }

  type TagFilter = { tag: string; checked: boolean }
  type Sorter = { label: string; key: keyof T; direction: 'asc' | 'desc' }

  export let items: T[]
  export let filters: Filter[]
  export let tagFilters: TagFilter[]
  export let sorters: Sorter[]
  export let processed: T[]
  export let quickLoad = false

  if (quickLoad) {
    processed = items
  }

  const cachedMetadata: Partial<Record<string, Metadata | null>> = {}

  let showModal = false
  let selectedSorter: Sorter['key'] = sorters[0].key
  let filtering = false

  const filterItems = async () => {
    filtering = true
    let processedItems: T[] = []

    // FILTER
    for (const item of items) {
      const id = item['id' as keyof T] as string

      let metadata: Metadata | null | undefined = cachedMetadata[id]

      // not yet cached
      if (typeof metadata === 'undefined') {
        metadata = await db.metadata.get(id)
        cachedMetadata[id] = metadata || null
      }

      const passesAllFilters = filters.every(({ values }) => {
        const checked = values.filter(({ checked }) => checked)
        return checked.length ? checked.some(({ predicate }) => predicate(item)) : true
      })

      const passesAllTagFilters = metadata
        ? tagFilters
            .filter(({ checked }) => checked)
            .some(({ tag }) => metadata!.tags.includes(tag))
        : true

      if (passesAllFilters && passesAllTagFilters) {
        processedItems.push(item)
      }
    }

    processed = processedItems
    filtering = false
  }

  const sortItems = () => {
    const sorter = sorters.find(({ key }) => key === selectedSorter)

    if (sorter) {
      // SORT
      inPlaceSort(processed)[sorter.direction]((i) => i[sorter.key])
      processed = processed
    }
  }

  const debouncedFilterItems = debounce(filterItems, 100)

  // recalculate on change
  $: if (filters && tagFilters && sorters) {
    debouncedFilterItems()
  }

  $: if (selectedSorter) {
    sortItems()
  }
</script>

<button on:click={() => (showModal = true)} class="w-[2em]">{@html filter}</button>

{#if showModal}
  <Modal on:close={() => (showModal = false)}>
    <div class="h-full overflow-auto w-full">
      <div class="font-semibold mb-2 text-2xl">{$translate('app.labels.filters')}</div>

      <div class="w-full flex flex-col gap-y-4">
        {#each filters as { label, values }}
          <div class="w-full">
            <div class="font-semibold text-sm text-neutral-300 mb-2">{label}</div>
            <div
              class="flex items-center flex-wrap gap-x-4 gap-y-2 bg-neutral-900 px-4 py-3 border border-neutral-600 rounded w-full"
            >
              {#each values as value}
                <div class="flex items-center">
                  <input
                    id={value.label}
                    type="checkbox"
                    bind:checked={value.checked}
                    class="checked:bg-purple-400 hover:checked:bg-purple-500 rounded-md"
                  />
                  <label class="ml-1 cursor-pointer" for={value.label}>{value.label}</label>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>

      <div class="font-semibold mb-2 mt-4 text-2xl">{$translate('app.labels.sort')}</div>

      <div class="w-full flex flex-col gap-y-4">
        {#each sorters as { label, key, direction }}
          <div class="w-full">
            <div class="flex items-center">
              <input id={label} type="radio" bind:group={selectedSorter} value={key} />
              <label class="ml-1" for={label}>{label}</label>
            </div>

            <div class="flex items-center gap-x-2 text-sm ml-4">
              {#each ['desc', 'asc'] as d}
                <div class="flex items-center">
                  <input
                    type="radio"
                    class="w-3 h-3"
                    bind:group={direction}
                    value={d}
                    id={`${d}:${label}`}
                  />
                  <label class="ml-1" for={`${d}:${label}`}>{$translate(`app.labels.${d}`)}</label>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </Modal>
{/if}

<!-- {#each ['desc', 'asc'] as d}
                <div class="cursor-pointer flex items-center">
                  <input
                    id={d}
                    type="radio"
                    bind:group={direction}
                    value={d}
                    class="checked:bg-purple-400 rounded-md"
                  />
                  <label class="leading-none ml-1" for={d}>{d}</label>
                </div>
              {/each} -->
