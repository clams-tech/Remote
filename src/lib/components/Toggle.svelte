<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  export let toggled = false
  export let large = false
  export let disabled = false

  const roundedStyles = large
    ? 'peer-checked:before:translate-x-6 before:h-5 before:w-5 before:left-[2px] before:bottom-[2px]'
    : 'peer-checked:before:translate-x-4 before:h-3 before:w-3 before:left-[2px] before:bottom-[2px]'

  const sliderStyles = large ? 'w-12 h-6' : 'w-8 h-4'

  const dispatch = createEventDispatcher()

  const handleClick = () => {
    toggled = !toggled
    dispatch('change')
  }
</script>

<button on:click|stopPropagation={handleClick} class="flex items-center">
  <slot name="left" />

  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <label on:click|stopPropagation class="relative inline-block m-0 {sliderStyles}">
    <input
      {disabled}
      bind:checked={toggled}
      on:change
      class="opacity-0 w-0 h-0 peer"
      type="checkbox"
    />
    <span
      class="absolute cursor-pointer top-0 left-0 right-0 bottom-0 bg-neutral-300 peer-checked:bg-purple-500 transition-all rounded-full before:absolute before:bg-white before:transition-all before:rounded-full before:shadow-md {roundedStyles}"
    />
  </label>

  <slot name="right" />
</button>
