<script lang="ts">
  import Warning from '$lib/icons/Warning.svelte'

  type InputType = 'text' | 'number' | 'textarea' | 'password' | 'email'

  export let type: InputType = 'text'
  export let value: string | number
  export let label = ''
  export let name: string
  export let invalid = ''
  export let placeholder = ''
  export let hint = ''
  export let width = '100%'
  export let disabled = false
  export let readonly = false
  export let rows = 1
  export let maxlength = 1000
  export let cursorPointer = false

  export const focus = () => input && input.focus()
  export const select = () => input && input.select()

  let input: HTMLInputElement | HTMLTextAreaElement

  $: styles = `flex items-center bg-transparent placeholder:text-neutral-400 w-full autofill:bg-transparent font-medium px-4 py-[14px] border border-neutral-200 dark:border-neutral-50 rounded appearance-none focus:outline-none focus:ring focus:border-white focus:ring-${
    invalid ? 'utility-error' : 'purple-500'
  } ${cursorPointer ? 'cursor-pointer' : ''}`

  // focus:outline-none
  // focus:ring
  // focus:border-white
  // focus:ring-utility-error
  // focus:ring-purple-500
  // h-8
  // cursor-pointer
</script>

<div style="width: {width};" class="flex flex-col relative">
  {#if label || hint}
    <div class="flex items-center mb-2 font-medium">
      <label class="text-sm w-1/2 text-inherit" for={name}>{label || ''}</label>
      <span class="flex justify-end text-neutral-400 text-xs w-1/2 cursor-default"
        >{@html hint}</span
      >
    </div>
  {/if}

  <div class="relative flex items-center">
    {#if type === 'text'}
      <input
        bind:this={input}
        on:blur
        on:input
        on:focus
        {readonly}
        {name}
        {placeholder}
        {disabled}
        class={styles}
        type="text"
        bind:value
      />
    {:else if type === 'number'}
      <input
        bind:this={input}
        on:blur
        on:input
        on:focus
        {readonly}
        {name}
        {placeholder}
        {disabled}
        class={styles}
        type="number"
        inputmode="numeric"
        pattern="\d*"
        bind:value
      />
    {:else if type === 'textarea'}
      <textarea
        bind:this={input}
        on:blur
        on:input
        on:focus
        {readonly}
        {name}
        {placeholder}
        {disabled}
        class={styles}
        {rows}
        {maxlength}
        bind:value
      />
    {:else if type === 'email'}
      <input
        bind:this={input}
        on:blur
        on:input
        on:focus
        {readonly}
        {name}
        {placeholder}
        {disabled}
        class={styles}
        type="email"
        bind:value
      />
    {:else}
      <input
        bind:this={input}
        on:blur
        on:input
        on:focus
        {readonly}
        {name}
        {placeholder}
        {disabled}
        class={styles}
        type="password"
        bind:value
      />
    {/if}

    <slot />
  </div>

  <div
    class="flex items-center transition-all overflow-hidden text-utility-error h-{invalid
      ? '8'
      : '0'}"
  >
    <span class="w-4 mr-2"><Warning /></span>
    <span class="text-xs font-medium">{invalid}</span>
  </div>
</div>
