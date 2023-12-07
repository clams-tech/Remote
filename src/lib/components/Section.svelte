<script>
  import { fade } from 'svelte/transition'
</script>

<section
  in:fade={{ duration: 250 }}
  class="rounded-lg p-3 w-full max-w-3xl bg-neutral-900/80 relative flex flex-col overflow-auto max-h-full"
>
  <slot />
</section>
