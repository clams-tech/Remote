<script>
  export let centered = false

  // items-baseline
  // items-center
</script>

<div
  on:click
  class="w-full flex justify-between items-{centered
    ? 'center'
    : 'baseline'} border-b border-b-neutral-200 dark:border-b-neutral-700 py-3"
>
  <span class="mr-2 text-neutral-800 dark:text-neutral-50 w-1/2"><slot name="label" /></span>

  <p class="flex items-center justify-end w-1/2">
    <slot name="value" />
  </p>
</div>
