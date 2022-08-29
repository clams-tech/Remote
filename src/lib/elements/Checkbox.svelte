<script lang="ts">
  import { noop } from '$lib/utils'

  export let label: string
  export let name: string
  export let checked: boolean
  export let handleChange = noop
  export let handleBlur = noop
</script>

<div class="flex items-center mb-7">
  <input
    id={name}
    {name}
    type="checkbox"
    class="appearance-none w-4 h-4 bg-transparent box-border border border-neutral-300 rounded flex items-center justify-center relative transition-all cursor-pointer checked:border-transparent checked:bg-purple-300 checked:text-white checked:after:absolute checked:after:h-4 checked:after:w-4 checked:after:flex checked:after:justify-center text-xs"
    bind:checked
    on:blur={handleBlur}
    on:change={handleChange}
  />
  <label class="ml-2 text-xs font-medium" for={name}>{@html label}</label>
</div>

<style>
  input[type='checkbox']:checked:after {
    content: url("data:image/svg+xml,%3Csvg width='8px' viewBox='0 0 14 11' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M0 6L5 11L14 2L12.59 0.58L5 8.17L1.41 4.59L0 6Z' fill='currentColor'/%3E%3C/svg%3E");
  }
</style>
