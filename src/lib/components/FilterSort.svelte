<script lang="ts">
  import { translate } from '$lib/i18n/translations.js'
  import filterIcon from '$lib/icons/filter.js'
  import Modal from './Modal.svelte'
  import type { Filter, FilterOption, Sorter } from '$lib/@types/common.js'
  import { createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher<{ filters: Filter[]; sort: Sorter }>()

  export let filterOptions: FilterOption[]
  export let sortOptions: Sorter[]

  const appliedFilters: Filter[] = []
  const appliedSorter: Sorter = sortOptions[0]

  let showModal = false
</script>

<button on:click={() => (showModal = true)} class="flex flex-col items-center justify-center">
  <div class="w-6">
    {@html filterIcon}
  </div>
  <div class="text-xs font-semibold">{$translate('app.labels.filter')}</div>
</button>

{#if showModal}
  <Modal on:close={() => (showModal = false)}>
    <div class="h-full overflow-auto w-full">
      <div class="font-semibold mb-2 text-2xl">{$translate('app.labels.filters')}</div>

      <div class="w-full flex flex-col gap-y-4">
        {#each filters as { label, value, comparison, key }}
          <div class="w-full">
            <div class="font-semibold text-sm text-neutral-300 mb-2">{label}</div>
            {#if comparison === 'includes'}
              <div
                class="flex items-center flex-wrap gap-x-4 gap-y-2 bg-neutral-900 px-4 py-3 border border-neutral-600 rounded w-full"
              >
                {#each value as val}
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
            {/if}
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
