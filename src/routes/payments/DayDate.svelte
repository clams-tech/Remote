<script lang="ts">
  import { formatDate } from '$lib/dates.js'

  export let date: number

  let formattedDate: string

  formatDate(date).then(f => (formattedDate = f))
</script>

{#if formattedDate}
  <div
    class="text-xs font-semibold sticky top-1 mb-1 py-1 px-3 rounded bg-neutral-900 w-min whitespace-nowrap shadow shadow-neutral-700/50"
  >
    {formattedDate}
  </div>
{/if}
