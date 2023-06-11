<script lang="ts">
  import { page } from '$app/stores'
  import { translate } from '$lib/i18n/translations.js'
  import check from '$lib/icons/check.js'
  import edit from '$lib/icons/edit.js'
  export let text = $translate(`app.routes.${$page.url.pathname}.title`)
  export let icon = ''
  export let editable = false

  let editing = false
  let input: HTMLInputElement

  function handleKeyup(e: Event) {
    const { key } = e as KeyboardEvent
    if (key === 'Enter') {
      editing = false
    }
  }

  function handleClick() {
    editing = !editing

    setTimeout(() => {
      input && input.focus()
    }, 10)
  }
</script>

<svelte:window on:keyup={handleKeyup} />

<div class="flex w-full justify-between items-center">
  <div class="flex items-center">
    {#if icon}
      <div class="w-10 mr-2">{@html icon}</div>
    {/if}

    {#if editing}
      <input
        bind:this={input}
        class="text-4xl my-[15.5px] font-bold px-0 py-0 bg-transparent autofill:bg-transparent border-none w-4/5 appearance-none focus:outline-none focus:ring focus:ring-transparent flex"
        type="text"
        bind:value={text}
      />
    {:else}
      <h1 class="text-4xl font-bold flex items-center py-4">
        {text}
      </h1>
    {/if}
  </div>

  {#if editable}
    <button on:click={handleClick} class:text-utility-success={editing} class="w-8 ml-2"
      >{@html editing ? check : edit}</button
    >
  {/if}
</div>
