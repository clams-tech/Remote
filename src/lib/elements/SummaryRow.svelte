<script>
  export let baseline = false
</script>

<button
  on:click
  class="w-full flex justify-between text-start {baseline
    ? 'items-baseline'
    : 'items-center'} border-b border-b-neutral-200 dark:border-b-neutral-700 py-3"
>
  <span class="mr-2 text-neutral-800 dark:text-neutral-200 w-1/4 whitespace-nowrap"
    ><slot name="label" /></span
  >

  <p class="flex items-center justify-end w-3/4 overflow-hidden text-right break-words">
    <slot name="value" />
  </p>
</button>
