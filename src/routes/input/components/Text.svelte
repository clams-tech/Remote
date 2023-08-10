<script lang="ts">
  import type { ParsedInput } from '$lib/@types/common.js'
  import Msg from '$lib/components/Msg.svelte'
  import TextInput from '$lib/components/TextInput.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import caret from '$lib/icons/caret.js'
  import pasteIcon from '$lib/icons/paste.js'
  import { parseInput } from '$lib/input-parser.js'
  import { clipboard } from '$lib/services.js'
  import { truncateValue } from '$lib/utils.js'
  import { createEventDispatcher, onMount } from 'svelte'
  import { slide } from 'svelte/transition'

  const dispatch = createEventDispatcher()

  let inputEl: HTMLTextAreaElement
  let input: string
  let errMsg = ''

  let parsed: ParsedInput | null = null

  $: if (input) {
    parsed = parseInput(input)
  }

  onMount(() => {
    inputEl.focus()
  })

  const paste = async () => {
    try {
      const val = await clipboard.read()

      if (val) {
        input = val
      }
    } catch (error) {
      errMsg = $translate('app.errors.permissions_clipboard')
    }
  }

  const enter = () => dispatch('input', input)

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      enter()
    }
  }
</script>

<svelte:window on:keyup={handleKeyPress} />

<div class="w-full relative flex h-full">
  <textarea
    bind:value={input}
    bind:this={inputEl}
    class="w-full bg-neutral-900 border-none rounded focus:ring-0 h-full"
    rows="12"
  />

  <div class="flex items-center absolute bottom-2.5 right-2 gap-x-2 pt-1">
    {#if parsed}
      <button
        disabled={parsed.type === 'unknown'}
        on:click={() => dispatch('input', parsed)}
        transition:slide={{ axis: 'x' }}
        class="py-1 px-4 shadow shadow-current rounded-full flex items-center bg-neutral-900 whitespace-nowrap"
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

    <button on:click={paste} class="py-1 px-4 rounded-full shadow shadow-current font-semibold"
      >{$translate('app.labels.paste')}</button
    >
    <button on:click={enter} class="rounded-full py-1 px-4 shadow shadow-current font-semibold"
      >{$translate('app.labels.enter')}</button
    >
  </div>
</div>

{#if errMsg}
  <div transition:slide>
    <Msg type="error" message={errMsg} />
  </div>
{/if}
