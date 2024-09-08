<script lang="ts">
  import type { PrismType } from '$lib/@types/plugins'
  import { formatDate } from '$lib/dates'

  import caret from '$lib/icons/caret.js'

  export let prism: PrismType

  const { prism_id, description, prism_members, timestamp } = prism

  console.log(`prism = `, prism)
</script>

<a
  href={`/plugins/prism/${prism_id}`}
  class="w-full flex items-start justify-between no-underline hover:bg-neutral-800/80 bg-neutral-900 transition-all p-4 rounded h-[80px]"
>
  <div class="flex flex-col justify-center h-full">
    <div class="font-semibold">Prism</div>
    <div class="w-full text-xs italic truncate whitespace-nowrap pr-1">{description}</div>
  </div>
  <div class="flex items-center ml-4 h-full">
    <div>
      <div class="w-full flex justify-end">
        <div
          class="flex items-center w-min text-xs font-semibold bg-neutral-800 mt-1 rounded-full px-3 h-5"
        >
          <div
            class="mr-1.5 w-4 h-4 leading-none flex items-center justify-center rounded-full bg-neutral-900 -mr-1"
          >
            {prism_members.length}
          </div>
          <div>members</div>
        </div>
      </div>
      <div class="text-right w-full text-xs italic truncate whitespace-nowrap pr-1">
        {#await formatDate(timestamp, 'do MMM hh:mma') then formatted}
          <div class="text-[0.75em] font-semibold mt-1">{formatted}</div>
        {/await}
      </div>
    </div>

    <div class="w-6 -rotate-90 -mr-1 ml-1">{@html caret}</div>
  </div>
</a>
