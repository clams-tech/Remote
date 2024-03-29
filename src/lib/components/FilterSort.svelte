<script lang="ts">
  import { translate } from '$lib/i18n/translations.js'
  import filterIcon from '$lib/icons/filter.js'
  import Modal from './Modal.svelte'
  import type { Filter, SortDirection, Sorters, TagFilterOption } from '$lib/@types/common.js'
  import { createEventDispatcher } from 'svelte'
  import Filters from './Filters.svelte'
  import Button from './Button.svelte'
  import { simpleDeepClone } from '$lib/utils.js'
  import { getAllTags } from '$lib/db/helpers.js'
  import TagFilters from './TagFilters.svelte'
  import { slide } from 'svelte/transition'
  import type { Tag } from '$lib/@types/metadata.js'
  import { routeFilters, routeSorters } from '$lib/filters.js'

  export let filters: Filter[]
  export let sorters: Sorters
  export let tags: Tag['id'][]
  export let route: string

  const dispatch = createEventDispatcher()

  let editedFilters: Filter[] = simpleDeepClone(filters)
  let editedSorters: Sorters = simpleDeepClone(sorters)
  let tagFiltersOptions: TagFilterOption[] = []
  let filtersModified = false
  let sorterModified = false
  let tagsModified = false

  // get all tags and set them as options
  getAllTags().then(allTags => {
    tagFiltersOptions = allTags.map(({ id, label }) => ({
      id,
      label,
      applied: tags.includes(id)
    }))
  })

  $: if (JSON.stringify(filters) !== JSON.stringify(editedFilters)) {
    filtersModified = true
  } else {
    filtersModified = false
  }

  $: if (
    JSON.stringify(sorters.applied) !==
    JSON.stringify({ key: editedSorters.applied.key, direction: editedSorters.applied.direction })
  ) {
    sorterModified = true
  } else {
    sorterModified = false
  }

  $: if (tagFiltersOptions.filter(({ applied }) => !!applied).length !== tags.length) {
    tagsModified = true
  } else {
    tagsModified = false
  }

  const applyChanges = () => {
    filters = simpleDeepClone(editedFilters)

    sorters.applied = simpleDeepClone({
      key: editedSorters.applied.key,
      direction: editedSorters.applied.direction
    })

    tags = tagFiltersOptions.filter(({ applied }) => !!applied).map(({ id }) => id)

    dispatch('updated')
    showModal = false
  }

  const reset = () => {
    filters = routeFilters(route)
    editedFilters = simpleDeepClone(filters)

    sorters = routeSorters(route)
    editedSorters = simpleDeepClone(sorters)

    tags = []

    tagFiltersOptions = tagFiltersOptions.map(({ id, label }) => ({
      id,
      label,
      applied: false
    }))

    dispatch('updated')
  }

  let showModal = false

  // reset edited filters and sorter when modal is closed
  $: if (showModal === false) {
    editedFilters = simpleDeepClone(filters)
    editedSorters = simpleDeepClone(sorters)
  }
</script>

<button on:click={() => (showModal = true)} class="flex flex-col items-center justify-center">
  <div class="w-6">
    {@html filterIcon}
  </div>
  <div class="text-xs font-semibold">{$translate('app.labels.filter')}</div>
</button>

{#if showModal}
  <Modal on:close={() => (showModal = false)}>
    <div class="h-full overflow-auto w-full flex-grow">
      <div class="font-semibold mb-2 text-2xl">{$translate('app.labels.filters')}</div>

      <div class="w-full flex flex-col gap-y-4">
        <Filters bind:filters={editedFilters} />
      </div>

      {#if tagFiltersOptions.length}
        <div class="w-full" in:slide={{ axis: 'y' }}>
          <TagFilters bind:tags={tagFiltersOptions} />
        </div>
      {/if}

      <div class="font-semibold mb-2 mt-4 text-2xl">{$translate('app.labels.sort')}</div>

      <div class="w-full flex flex-col gap-y-4 ml-1">
        {#each sorters.options as sorter}
          <div class="w-full">
            <div class="flex items-center">
              <input
                name={sorter.label}
                id={sorter.label}
                type="radio"
                bind:group={editedSorters.applied.key}
                value={sorter.key}
              />
              <label class="ml-1" for={sorter.label}>{sorter.label}</label>
            </div>

            <div class="flex items-center gap-x-2 text-sm ml-4">
              {#each ['asc', 'desc'] as direction}
                <div class="flex items-center">
                  <input
                    type="radio"
                    class="w-3 h-3"
                    bind:group={editedSorters.applied.direction}
                    value={direction}
                    name={`${direction}:${sorter.label}`}
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
    </div>

    <div class="w-full flex justify-end gap-x-2 sticky pt-4 bottom-0 right-4">
      <div class="w-min">
        <Button on:click={reset} text={$translate('app.labels.reset')} />
      </div>

      <div class="w-min">
        <Button
          primary
          on:click={applyChanges}
          text={$translate('app.labels.apply')}
          disabled={!filtersModified && !sorterModified && !tagsModified}
        />
      </div>
    </div>
  </Modal>
{/if}
