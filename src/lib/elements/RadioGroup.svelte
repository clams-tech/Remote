<script lang="ts">
  import { noop } from '$lib/utils'

  export let label: string
  export let inputs: { name: string; display: string; value: string }[]
  export let groupName: string
  export let value: unknown
  export let handleChange = noop
  export let handleBlur = noop
  export let direction: 'row' | 'column' = 'column'
</script>

<div class="mb-7 text-current text-sm font-medium">
  <span>{label}</span>

  <div style="flex-direction: {direction};" class="flex mt-2">
    {#each inputs as { name, display, value: inputValue } (`${name}:${display}`)}
      <label class="flex items-center mr-2 text-xs font-medium" for={name}>
        <input
          id={name}
          name={groupName}
          class="appearance-none bg-white mr-2 h-4 w-4 border border-neutral-400 checked:border-white rounded-full grid place-content-center before:content-[''] before:w-[15px] before:h-[15px] before:rounded-full before:transition-all before:border-[5px] before:border-white before:checked:border-purple-500Light"
          on:change={handleChange}
          on:blur={handleBlur}
          bind:group={value}
          value={inputValue}
          type="radio"
        />
        {display}
      </label>
    {/each}
  </div>
</div>
