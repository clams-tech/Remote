<script lang="ts">
  import { settings$ } from '$lib/streams'
  import { formatValueForDisplay } from '$lib/utils'
  import { currencySymbols } from '$lib/constants'
  import { onMount } from 'svelte'
  import Spinner from '$lib/elements/Spinner.svelte'
  import exchange from '$lib/icons/exchange'

  /**
   * value must be converted to primaryDenomination when passed in
   */
  export let primary: string | null
  export let secondary: string | null
  export let readonly = false

  let primaryValueNumber: number | null = primary
    ? Number(
        formatValueForDisplay({
          value: primary,
          denomination: settings$.value.primaryDenomination
        })
      )
    : null

  $: if (typeof primaryValueNumber === 'number') {
    primary = primaryValueNumber.toString()
  } else if (typeof primaryValueNumber === 'undefined') {
    primary = ''
  }

  onMount(() => {
    setTimeout(focus, 250)
  })

  let input: HTMLInputElement

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
    primary = newPrimaryValue || null
    primaryValueNumber = newPrimaryValue ? Number(newPrimaryValue) : null

    setTimeout(focus, 200)
  }

  $: inputStep =
    $settings$.primaryDenomination === 'btc'
      ? 0.00000001
      : $settings$.primaryDenomination === 'sats'
      ? 1
      : 0.01

  $: primarySymbol = currencySymbols[$settings$.primaryDenomination]
  $: secondarySymbol = currencySymbols[$settings$.secondaryDenomination]
</script>

<div class="flex items-center w-full justify-center">
  <div class="flex flex-col items-end w-full">
    <div
      on:click={focus}
      class="flex items-center border-b-4 border-b-purple-500 pt-4 pb-2 rounded w-full relative"
    >
      <div class="flex items-center w-full">
        <span
          class="text-4xl flex justify-center items-center font-semibold"
          class:w-9={primarySymbol.startsWith('<')}
          class:mr-1={!primarySymbol.startsWith('<')}
        >
          {@html primarySymbol}
        </span>
        <div class="relative">
          <div class="text-4xl font-semibold cursor-pointer font-mono">
            {#if primary !== null}
              {#if readonly}
                <span
                  class="caret-neutral-900 w-full dark:caret-white text-4xl border-none outline-none font-semibold bg-transparent cursor-pointer font-mono"
                  >{formatValueForDisplay({
                    value: primary,
                    denomination: settings$.value.primaryDenomination,
                    commas: true
                  })}</span
                >
              {:else}
                <input
                  bind:this={input}
                  bind:value={primaryValueNumber}
                  placeholder="0"
                  type="number"
                  min="0"
                  step={inputStep}
                  class="caret-neutral-900 w-full dark:caret-white text-4xl border-none outline-none font-semibold bg-transparent cursor-pointer font-mono"
                />
              {/if}
            {:else}
              <div class="ml-2">
                <Spinner size="2rem" />
              </div>
            {/if}
          </div>
        </div>
      </div>
      <div
        on:click|stopPropagation={switchDenomination}
        class="w-6 ml-6 p-1 absolute right-0 box-content text-neutral-400 hover:text-neutral-600 hover:border-neutral-600 transition-all rotate-90 cursor-pointer"
      >
        {@html exchange}
      </div>
    </div>

    <div
      class="cursor-pointer text-neutral-600 dark:text-neutral-300 hover:text-neutral-800 dark:hover:text-neutral-100 mt-3 flex items-center"
      on:click={switchDenomination}
    >
      <span
        class="text-base flex items-center justify-center"
        class:w-4={secondarySymbol.startsWith('<')}
      >
        {@html secondarySymbol}
      </span>
      <span class="text-base font-mono">
        {#if secondary}
          {formatValueForDisplay({
            value: secondary,
            denomination: $settings$.secondaryDenomination,
            commas: true
          })}
        {:else}
          <div class="ml-1">
            <Spinner size="1rem" />
          </div>
        {/if}
      </span>
    </div>
  </div>
</div>
