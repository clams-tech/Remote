<script lang="ts">
  import Spinner from './Spinner.svelte'

  export let text = ''
  export let disabled = false
  export let requesting = false
  export let small = false
  export let primary = false
  export let warning = false

  let button: HTMLButtonElement

  export const click = () => {
    button && button.click()
  }
</script>

<button
  bind:this={button}
  on:click
  class="no-underline text-center text-neutral-200 hover:text-white transition-all text-base active:shadow-sm shadow-sm hover:shadow-md disabled:bg-disabled disabled:border-disabled w-full flex items-center justify-center relative rounded-md px-4 border-2 border-solid border-current font-semibold hover:bg-neutral-800/40"
  class:opacity-40={disabled}
  class:border-purple-500={primary}
  class:border-utility-error={warning}
  class:px-2={small}
  class:text-xs={small}
  class:hover:shadow-purple-500={primary}
  class:hover:shadow-utility-error={warning}
  class:hover:hover:shadow-current={!primary && !warning}
  disabled={disabled || requesting}
>
  <div class:text-transparent={requesting}>
    <slot name="iconLeft" />
  </div>

  {#if requesting}
    <div class="absolute">
      <Spinner size={small ? '1rem' : '1.5rem'} />
    </div>
  {/if}

  <span class="py-2" class:py-1={small} class:text-transparent={requesting}>
    {text}
  </span>

  <div class:text-transparent={requesting}>
    <slot name="iconRight" />
  </div>
</button>
