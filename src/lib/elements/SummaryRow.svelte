<div
  on:click
  class="w-full flex justify-between items-center border-b border-b-neutral-200 dark:border-b-neutral-700 py-3"
>
  <span class="mr-2"><slot name="label" /></span>
  <p class="flex items-center">
    <slot name="value" />
  </p>
</div>
