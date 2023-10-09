<script lang="ts">
  import { createRandomHex } from '$lib/crypto.js'
  import { appWorker, appWorkerMessages$ } from '$lib/worker.js'
  import { BehaviorSubject, filter, firstValueFrom, map } from 'rxjs'
  import debounce from 'lodash.debounce'
  import { translate } from '$lib/i18n/translations.js'
  import filterIcon from '$lib/icons/filter.js'
  import Modal from './Modal.svelte'
  import type { Filter, Sorter, TagFilter } from '$lib/@types/common.js'

  export let items: unknown[]
  export let filters: Filter[]
  export let tagFilters: TagFilter[]
  export let sorters: Sorter[]
  export let processed: unknown[]

  let showModal = false
  let selectedSorterKey: Sorter['key'] = sorters[0].key
  let selectedSorter = sorters[0]

  processed = items

  $: if (selectedSorterKey !== selectedSorter.key) {
    updateSorter()
  }

  $: if (items || filters.length || tagFilters.length || selectedSorter) {
    processItems()
  }

  const processItems = debounce(async () => {
    const filtered = await filterItems(items)
    const sorted = await sortItems(filtered)

    processed = sorted
  }, 50)

  const updateSorter = () =>
    (selectedSorter = sorters.find(({ key }) => key === selectedSorterKey) || sorters[0])

  const filterItems = async (items: unknown[]) => {
    if ((!filters.length && !tagFilters.length) || !items.length) return items

    const id = createRandomHex()

    appWorker.postMessage({ id, type: 'filter-items', filters, tagFilters, items })

    const result = (await firstValueFrom(
      appWorkerMessages$.pipe(
        filter(({ data }) => data.id === id),
        map(({ data }) => data.result)
      )
    )) as unknown[]

    return result
  }

  const sortItems = async (items: unknown[]) => {
    if (!items.length) return items

    const id = createRandomHex()

    appWorker.postMessage({ id, type: 'sort-items', items, sorter: selectedSorter })

    const result = (await firstValueFrom(
      appWorkerMessages$.pipe(
        filter(({ data }) => data.id === id),
        map(({ data }) => data.result)
      )
    )) as unknown[]

    return result
  }
</script>

<div class="flex flex-col items-center justify-center">
  <button on:click={() => (showModal = true)} class="w-[2em]">{@html filterIcon}</button>
  <div class="text-xs font-semibold">{$translate('app.labels.filter')}</div>
</div>

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
        {#each sorters as sorter}
          <div class="w-full">
            <div class="flex items-center">
              <input
                id={sorter.label}
                type="radio"
                bind:group={selectedSorterKey}
                value={sorter.key}
              />
              <label class="ml-1" for={sorter.label}>{sorter.label}</label>
            </div>

            <div class="flex items-center gap-x-2 text-sm ml-4">
              {#each ['desc', 'asc'] as d}
                <div class="flex items-center">
                  <input
                    type="radio"
                    class="w-3 h-3"
                    bind:group={selectedSorter.direction}
                    value={d}
                    id={`${d}:${sorter.label}`}
                  />
                  <label class="ml-1" for={`${d}:${sorter.label}`}
                    >{$translate(`app.labels.${d}`)}</label
                  >
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </Modal>
{/if}
