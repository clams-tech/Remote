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
  export let quickLoad = false

  if (quickLoad) {
    processed = items
  }

  let showModal = false
  let selectedSorterKey: Sorter['key'] = sorters[0].key
  let selectedSorter = sorters[0]

  $: if (selectedSorterKey !== selectedSorter.key) {
    updateSorter()
  }

  const updateSorter = () =>
    (selectedSorter = sorters.find(({ key }) => key === selectedSorterKey) || sorters[0])

  const filtering$ = new BehaviorSubject<boolean>(false)
  const sorting$ = new BehaviorSubject<boolean>(false)

  const filterItems = async () => {
    if ($sorting$) {
      // wait until finished sorting
      await firstValueFrom(sorting$.pipe(filter(x => !x)))
    }

    filtering$.next(true)

    const id = createRandomHex()

    appWorker.postMessage({ id, type: 'filter-items', filters, tagFilters, items })

    processed = (await firstValueFrom(
      appWorkerMessages$.pipe(
        filter(({ data }) => data.id === id),
        map(({ data }) => data.result)
      )
    )) as unknown[]

    filtering$.next(false)
  }

  const sortItems = async () => {
    if ($filtering$) {
      // wait until finished filtering
      await firstValueFrom(filtering$.pipe(filter(x => !x)))
    }

    if (selectedSorter) {
      sorting$.next(true)
      const id = createRandomHex()

      appWorker.postMessage({ id, type: 'sort-items', items, sorter: selectedSorter })

      processed = (await firstValueFrom(
        appWorkerMessages$.pipe(
          filter(({ data }) => data.id === id),
          map(({ data }) => data.result)
        )
      )) as unknown[]

      sorting$.next(false)
    }
  }

  const debouncedFilterItems = debounce(filterItems, 100)

  // recalculate on change
  $: if (filters && tagFilters) {
    debouncedFilterItems()
  }

  $: if (selectedSorter) {
    sortItems()
  }
</script>

<button on:click={() => (showModal = true)} class="w-[2em]">{@html filterIcon}</button>

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
