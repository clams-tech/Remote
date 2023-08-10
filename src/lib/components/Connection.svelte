<script lang="ts">
  import type { ConnectionDetails } from '$lib/@types/connections.js'
  import { connectionOptions } from '$lib/connections/index.js'

  export let data: ConnectionDetails
  export let selected = false

  const connectionTypeDetails = connectionOptions.find((c) => c.type === data.type)
</script>

<button
  on:click
  class:border-purple-500={selected}
  class:border-2={selected}
  class="rounded border flex flex-col items-center justify-center aspect-square w-32 p-2 bg-neutral-900 hover:bg-neutral-800/70 transition-all relative"
>
  {#if connectionTypeDetails}
    <div class="p-1">{@html connectionTypeDetails.icon}</div>
  {/if}

  <div class="font-semibold truncate w-full text-center absolute bottom-2">{data.label}</div>
</button>
