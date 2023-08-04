<script lang="ts">
  import type { ParsedInput } from '$lib/@types/common.js'
  import Msg from '$lib/elements/Msg.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import caret from '$lib/icons/caret.js'
  import nfcIcon from '$lib/icons/nfc.js'
  import { parseInput } from '$lib/input-parser.js'
  import { nfc } from '$lib/services.js'
  import { truncateValue } from '$lib/utils.js'
  import { createEventDispatcher } from 'svelte'
  import { slide } from 'svelte/transition'

  const dispatch = createEventDispatcher()

  let reading = false
  let errMsg = ''
  let parsed: ParsedInput | null = null

  const read = async () => {
    reading = true

    try {
      const results = await nfc.read()
      const parsedResults = results.map(parseInput)
      parsed = parsedResults.find(({ type }) => type !== 'unknown') || parsedResults[0]
    } catch (error) {
      reading = false
      errMsg = $translate('app.errors.nfc_read')
    }
  }
</script>

<div class="flex flex-col justify-center items-center w-full h-[304px] p-4 relative">
  {#if reading}
    <button class="absolute w-10 p-1 animate-ping">{@html nfcIcon}</button>
  {/if}

  <button on:click={read} class="w-10 shadow shadow-current rounded-full p-1"
    >{@html nfcIcon}</button
  >

  {#if errMsg}
    <div transition:slide class="absolute bottom-2">
      <Msg type="error" message={errMsg} />
    </div>
  {/if}

  {#if parsed}
    <button
      disabled={parsed.type === 'unknown'}
      on:click={() => dispatch('input', parsed)}
      transition:slide={{ axis: 'x' }}
      class="absolute bottom-2.5 right-2 py-1 px-4 shadow shadow-current rounded-full flex items-center bg-neutral-900 whitespace-nowrap"
    >
      <div class="font-semibold mr-1">
        {$translate(`app.labels.${parsed.type}`)}:
      </div>
      <div>
        {truncateValue(parsed.value)}
      </div>
      <div class="w-4 -rotate-90 ml-1 -mr-2">{@html caret}</div>
    </button>
  {/if}
</div>
