<script lang="ts">
  import Spinner from './Spinner.svelte'

  export let text = ''
  export let disabled = false
  export let requesting = false
  export let primary = false
  export let warning = false

  let button: HTMLButtonElement

  export const click = () => {
    button && button.click()
  }
</script>

<div class="w-full p-0.5 relative">
  <button
    bind:this={button}
    on:click
    class="no-underline text-center text-current transition-all text-[1em] shadow shadow-current w-full flex items-center justify-center px-[1.5em] relative rounded-full font-semibold hover:bg-neutral-800/70 bg-neutral-900 whitespace-nowrap"
    class:opacity-70={disabled}
    class:border={primary || warning}
    class:border-purple-500={primary}
    class:border-utility-error={warning}
    disabled={disabled || requesting}
  >
    <div class:text-transparent={requesting}>
      <slot name="iconLeft" />
    </div>

    {#if requesting}
      <div class="absolute">
        <Spinner size="1.5em" />
      </div>
    {/if}

    <span class:text-transparent={requesting} class="py-[0.5em]">
      {text}
    </span>

    <div class:text-transparent={requesting}>
      <slot name="iconRight" />
    </div>
  </button>
</div>
