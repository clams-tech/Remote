<script>
  export let baseline = false
</script>

<div
  class="w-full flex justify-between text-start {baseline
    ? 'items-baseline'
    : 'items-center'} border-b border-b-neutral-700 py-3"
>
  <span class="mr-2 text-neutral-300 w-1/4 whitespace-nowrap font-semibold"
    ><slot name="label" /></span
  >

  <p
    class="flex items-center justify-end w-3/4 overflow-hidden text-right break-words text-neutral-50"
  >
    <slot name="value" />
  </p>
</div>
