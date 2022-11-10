<script lang="ts">
  import Exchange from '$lib/icons/Exchange.svelte'
  import { settings$ } from '$lib/streams'
  import { formatValueForDisplay } from '$lib/utils'
  import { onMount } from 'svelte'
  import { FiatDenomination } from '$lib/types'
  import Spinner from '$lib/elements/Spinner.svelte'

  /**
   * value must be converted to primaryDenomination when passed in
   */
  export let primary: string | null
  export let secondary: string | null
  export let readonly = false

  $: if (primary && input) {
    input.style.width = primary.length + 'ch'
  }

  let input: HTMLInputElement

  onMount(() => {
    setTimeout(() => {
      if (input && primary) {
        input.value = primary
        input.focus()
      }
    }, 250)
  })

  function focus() {
    input && input.focus()
  }

  function switchDenomination() {
    const currentSettings = settings$.value

    settings$.next({
      ...currentSettings,
      primaryDenomination: currentSettings.secondaryDenomination,
      secondaryDenomination: currentSettings.primaryDenomination
    })

    const newPrimaryValue = formatValueForDisplay({
      value: secondary,
      denomination: currentSettings.secondaryDenomination
    })

    secondary = primary
    primary = newPrimaryValue
  }

  function handleInput(e: Event) {
    const { data } = e as InputEvent
    primary = primary || '0'
    const decimalIndex = primary.indexOf('.')

    // handle backspace
    if (data === null) {
      const newValue = primary.length === 1 ? '0' : input.value
      primary = newValue
      input.value = newValue.slice(-1) === '.' ? `${newValue.slice(0, -1)}0` : newValue

      return
    }

    const { primaryDenomination } = settings$.value

    // handle invalid input
    if (
      // not a number or decimal point
      !/[0-9.]/.test(data) ||
      // sats cannot have decimals, so remove
      (primaryDenomination === 'sats' && data === '.') ||
      // sats max length is 9
      (primaryDenomination === 'sats' && primary.length >= 9) ||
      // max length for btc and fiat
      primary.length >= 10 ||
      // no double decimal points
      (data === '.' && primary.includes('.')) ||
      // fiat value and already two values after decimal point
      ($settings$.primaryDenomination in FiatDenomination &&
        data &&
        decimalIndex >= 1 &&
        decimalIndex === primary.length - 3) ||
      // btc value and already 8 values after decimal point
      ($settings$.primaryDenomination === 'btc' &&
        data &&
        decimalIndex >= 1 &&
        decimalIndex === primary.length - 9)
    ) {
      input.value = primary
      return
    }

    // remove leading 0 if not decimal
    if (primary.length && primary[0] === '0' && primary[1] !== '.' && data !== '.') {
      input.value = data
      primary = data
      return
    }

    input.value = formatValueForDisplay({
      value: input.value,
      denomination: $settings$.primaryDenomination,
      input: true
    })

    primary = input.value
  }
</script>

<div class="flex items-center w-full justify-center">
  <div class="flex flex-col items-end w-full">
    <div
      on:click={focus}
      class="flex items-center border-b-4 border-b-purple-500 pt-4 pb-2 rounded w-full"
    >
      <div class="flex items-end w-full" class:items-center={!primary}>
        <div class="relative flex items-center">
          <div class="text-4xl font-semibold cursor-pointer font-mono">
            {#if primary}
              {formatValueForDisplay({
                value: primary,
                denomination: $settings$.primaryDenomination,
                commas: readonly,
                input: !readonly
              })}
            {:else}
              <div class="mr-2">
                <Spinner size="1.5rem" />
              </div>
            {/if}
          </div>
          {#if !readonly}
            <input
              bind:this={input}
              on:input={handleInput}
              type="number"
              step="any"
              class="absolute caret-neutral-900 dark:caret-white h-12 top-0 left-0 text-4xl border-none outline-none font-semibold bg-transparent text-transparent cursor-pointer font-mono"
            />
          {/if}
        </div>
        <span class="ml-2 text-lg leading-1 font-semibold">
          {$settings$.primaryDenomination.toUpperCase()}
        </span>
      </div>
      <div
        on:click|stopPropagation={switchDenomination}
        class="w-6 ml-6 p-1 box-content text-neutral-400 hover:text-neutral-600 hover:border-neutral-600 transition-all rotate-90 cursor-pointer"
      >
        <Exchange />
      </div>
    </div>

    <div
      class="cursor-pointer text-neutral-600 dark:text-neutral-300 hover:text-neutral-800 dark:hover:text-neutral-100 mt-3"
      class:flex={!secondary}
      class:items-center={!secondary}
      on:click={switchDenomination}
    >
      <span class="text-base font-mono">
        {#if secondary}
          {formatValueForDisplay({
            value: secondary,
            denomination: $settings$.secondaryDenomination,
            commas: true
          })}
        {:else}
          <div class="mr-2">
            <Spinner size="1rem" />
          </div>
        {/if}
      </span>
      <span class="text-xs">
        {$settings$.secondaryDenomination.toUpperCase()}
      </span>
    </div>
  </div>
</div>
