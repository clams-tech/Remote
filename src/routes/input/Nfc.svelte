<script lang="ts">
  import type { ParsedInput } from '$lib/@types/common.js'
  import nfcIcon from '$lib/icons/nfc.js'
  import { parseInput } from '$lib/input-parser.js'
  import { nfc } from '$lib/services.js'
  import { createEventDispatcher } from 'svelte'
  import { slide } from 'svelte/transition'
  import ParsedInputButton from './ParsedInputButton.svelte'
  import type { AppError } from '$lib/@types/errors.js'
  import { nowSeconds } from '$lib/utils.js'
  import ErrorDetail from '$lib/components/ErrorDetail.svelte'

  const dispatch = createEventDispatcher()

  let reading = false
  let err: AppError | null = null
  let parsed: ParsedInput | null = null

  const read = async () => {
    reading = true

    try {
      const results = await nfc.read()
      const parsedResults = results.map(parseInput)
      parsed = parsedResults.find(({ type }) => type !== 'unknown') || parsedResults[0]
    } catch (error) {
      const { message } = error as Error
      err = {
        key: 'nfc_read',
        detail: {
          timestamp: nowSeconds(),
          message,
          context: 'Attempt to read NFC'
        }
      }
    } finally {
      reading = false
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

  {#if err}
    <div transition:slide={{ axis: 'y' }} class="absolute bottom-2">
      <ErrorDetail error={err} />
    </div>
  {/if}

  {#if parsed}
    <div class="absolute bottom-2.5 right-2">
      <ParsedInputButton {parsed} on:click={() => dispatch('input', parsed)} />
    </div>
  {/if}
</div>
