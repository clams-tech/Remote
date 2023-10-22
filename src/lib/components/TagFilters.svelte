<script lang="ts">
  import { translate } from '$lib/i18n/translations.js'

  export let options: string[]
  export let tags: string[]

  const handleCheck = (tag: string) => {
    if (tags.includes(tag)) {
      tags = tags.filter(t => t !== tag)
    } else {
      tags = [...tags, tag]
    }
  }
</script>

<div class="w-full">
  <div class="font-semibold text-sm text-neutral-300 mb-2">{$translate('app.labels.tags')}</div>
  <div
    class="flex items-center flex-wrap gap-x-4 gap-y-2 bg-neutral-900 px-4 py-3 border border-neutral-600 rounded w-full"
  >
    {#each options as tag}
      <div class="flex items-center">
        <input
          id={tag}
          type="checkbox"
          checked={tags.includes(tag)}
          on:click={() => handleCheck(tag)}
          class="checked:bg-purple-400 hover:checked:bg-purple-500 rounded-md"
        />
        <label class="ml-1 cursor-pointer" for={tag}>{tag}</label>
      </div>
    {/each}
  </div>
</div>
