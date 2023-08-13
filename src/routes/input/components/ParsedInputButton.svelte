<script lang="ts">
  import type { ParsedInput } from '$lib/@types/common.js'
  import { translate } from '$lib/i18n/translations.js'
  import caret from '$lib/icons/caret.js'
  import { truncateValue } from '$lib/utils.js'
  import { slide } from 'svelte/transition'

  export let parsed: ParsedInput
</script>

<button
  disabled={parsed.type === 'unknown'}
  on:click
  transition:slide={{ axis: 'x' }}
  class="py-1 px-4 shadow shadow-current rounded-full flex items-center bg-neutral-900 whitespace-nowrap"
>
  <div class="font-semibold mr-1" class:text-utility-error={parsed.type === 'unknown'}>
    {$translate(`app.labels.${parsed.type}`)}:
  </div>
  <div>
    {truncateValue(parsed.value)}
  </div>
  <div class="w-4 -rotate-90 ml-1 -mr-2">{@html caret}</div>
</button>
