<script lang="ts">
  import Spinner from './Spinner.svelte'

  export let text = ''
  export let disabled = false
  export let requesting = false
  export let small = false
  export let primary = false

  export const click = () => {
    button && button.click()
  }

  let button: HTMLButtonElement
</script>

<button
  bind:this={button}
  on:click
  style={`opacity: ${disabled ? '0.4' : '1'}`}
  class="text-current no-underline {small ? 'text-xs' : 'text-base'} {primary
    ? 'hover:shadow-purple-500'
    : 'hover:shadow-current'} active:shadow-sm shadow-sm hover:shadow-md disabled:bg-disabled disabled:border-disabled w-full flex items-center justify-center relative rounded-md {small
    ? 'px-2 py-1'
    : 'px-4 py-3'} border-2 border-solid {primary
    ? 'border-purple-500'
    : 'border-current'} font-semibold"
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

  <span class:text-transparent={requesting}>
    {text}
  </span>

  <div class:text-transparent={requesting}>
    <slot name="iconRight" />
  </div>
</button>
