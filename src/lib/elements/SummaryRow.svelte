<script>
  export let baseline = false

  // items-baseline
  // items-center
</script>

<div
  on:click
  class="w-full flex justify-between items-{baseline
    ? 'baseline'
    : 'center'} border-b border-b-neutral-200 dark:border-b-neutral-700 py-3"
>
  <span class="mr-2 text-neutral-800 dark:text-neutral-200 w-1/3 whitespace-nowrap"
    ><slot name="label" /></span
  >

  <p class="flex items-center justify-end w-2/3">
    <slot name="value" />
  </p>
</div>
