<script lang="ts">
  import type { ParsedInput } from '$lib/@types/common.js'
  import Msg from '$lib/elements/Msg.svelte'
  import TextInput from '$lib/elements/TextInput.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import pasteIcon from '$lib/icons/paste.js'
  import { parseInput } from '$lib/input-parser.js'
  import { clipboard } from '$lib/services.js'
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
      console.log({ error })
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

<div class="w-full relative">
  <textarea
    bind:value={input}
    bind:this={inputEl}
    class="w-full bg-neutral-900 border-none rounded focus:ring focus:ring-purple-500"
    rows="12"
  />

  <div class="flex items-center absolute bottom-4 right-2 gap-x-2">
    {#if parsed}
      <div transition:slide={{ axis: 'x' }} class="font-semibold p-2">
        {$translate(`app.labels.${parsed.type}`)}
      </div>
    {/if}

    <button on:click={paste} class="w-10 p-2 rounded bg-neutral-800">{@html pasteIcon}</button>
    <button on:click={enter} class="rounded p-2 bg-neutral-800"
      >{$translate('app.labels.enter')}</button
    >
  </div>
</div>

{#if errMsg}
  <div transition:slide>
    <Msg type="error" message={errMsg} />
  </div>
{/if}
