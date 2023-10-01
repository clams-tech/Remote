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

<div class="w-full p-0.5">
  <button
    bind:this={button}
    on:click
    class="no-underline text-center border-2 border-neutral-50 text-current transition-all text-[1em] hover:shadow-md w-full flex items-center justify-center px-[2em] relative rounded-full font-bold whitespace-nowrap"
    class:opacity-70={disabled}
    class:border-utility-error={warning}
    class:bg-purple-700={primary}
    class:bg-neutral-900={!primary}
    class:hover:shadow-purple-500={primary && !disabled}
    class:hover:shadow-neutral-50={!primary && !warning && !disabled}
    class:hover:shadow-utility-error={warning && !disabled}
    disabled={disabled || requesting}
  >
    <div class="absolute top-0 right-0 w-full h-full rounded-full overflow-hidden opacity-70">
      <img src="/images/shell1.png" class="h-auto w-full" alt="texture" />
    </div>

    <div class="relative flex items-center justify-center">
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
    </div>
  </button>
</div>
