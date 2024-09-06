<script lang="ts">
  import type { PrismType } from '$lib/@types/plugins'

  import caret from '$lib/icons/caret.js'

  export let prism: PrismType
</script>

<a
  href={`/plugins/prism${prism.prism_id}`}
  class="w-full flex items-start justify-between no-underline hover:bg-neutral-800/80 bg-neutral-900 transition-all p-4 rounded h-[102px]"
>
  <div class="w-6 -rotate-90 -mr-1 ml-1">{@html caret}</div>
</a>
