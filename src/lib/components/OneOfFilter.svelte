<script lang="ts">
  import type { OneOfFilter } from '$lib/@types/common.js'

  export let filter: OneOfFilter
</script>

<div class="w-full">
  <div class="font-semibold text-sm text-neutral-300 mb-2">{filter.label}</div>
  <div
    class="flex items-center flex-wrap gap-x-4 gap-y-2 bg-neutral-900 px-4 py-3 border border-neutral-600 rounded w-full"
  >
    {#each filter.values as value}
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
