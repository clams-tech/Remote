<script lang="ts">
  import { translate } from '$lib/i18n/translations.js'
  import filterIcon from '$lib/icons/filter.js'
  import Modal from './Modal.svelte'
  import type { Filter, Sorters } from '$lib/@types/common.js'
  import { createEventDispatcher } from 'svelte'
  import OneOfFilter from './OneOfFilter.svelte'
  import Button from './Button.svelte'

  const dispatch = createEventDispatcher()

  export let filters: Filter[]
  export let sorters: Sorters

  let editedFilters = filters
  let selectedSorterKey = sorters.applied.key
  let selectedSorterDirection = sorters.applied.direction
  let modified = false

  $: if (JSON.stringify(filters) !== JSON.stringify(editedFilters)) {
    modified = true
  } else {
    modified = false
  }

  $: if (
    JSON.stringify(sorters.applied) !==
    JSON.stringify({ key: selectedSorterKey, direction: selectedSorterDirection })
  ) {
    modified = true
  } else {
    modified = false
  }

  const applyChanges = () => {
    filters = editedFilters
    sorters.applied = { key: selectedSorterKey, direction: selectedSorterDirection }
    dispatch('update')
  }

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
        {#each editedFilters as filter}
          {@const { type } = filter}
          {#if type === 'one-of'}
            <OneOfFilter bind:filter />
          {/if}
        {/each}
      </div>

      <div class="font-semibold mb-2 mt-4 text-2xl">{$translate('app.labels.sort')}</div>

      <div class="w-full flex flex-col gap-y-4">
        {#each sorters.options as sorter}
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
              {#each ['desc', 'asc'] as direction}
                <div class="flex items-center">
                  <input
                    type="radio"
                    class="w-3 h-3"
                    bind:group={selectedSorterDirection}
                    value={direction}
                    id={`${direction}:${sorter.label}`}
                  />
                  <label class="ml-1" for={`${direction}:${sorter.label}`}
                    >{$translate(`app.labels.${direction}`)}</label
                  >
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>

      <Button text={$translate('app.labels.apply')} disabled={!modified} on:click={applyChanges} />
    </div>
  </Modal>
{/if}
