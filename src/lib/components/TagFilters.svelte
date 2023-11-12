<script lang="ts">
  import type { TagFilterOption } from '$lib/@types/common.js'
  import { translate } from '$lib/i18n/translations.js'

  export let tags: TagFilterOption[]
</script>

<div class="w-full">
  <div class="font-semibold text-sm text-neutral-300 mb-2">{$translate('app.labels.tags')}</div>
  <div
    class="flex items-center flex-wrap gap-x-4 gap-y-2 bg-neutral-900 px-4 py-3 border border-neutral-600 rounded w-full"
  >
    {#each tags as tag}
      <div class="flex items-center">
        <input
          name={tag.id}
          id={tag.id}
          type="checkbox"
          bind:checked={tag.applied}
          class="checked:bg-purple-400 hover:checked:bg-purple-500 rounded-md"
        />
        <label class="ml-1 cursor-pointer" for={tag.id}>{tag.label}</label>
      </div>
    {/each}
  </div>
</div>
