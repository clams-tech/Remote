<script>
  import { fade } from 'svelte/transition'
</script>

<section
  in:fade|local={{ duration: 250 }}
  class="md:rounded-lg px-3 py-6 md:p-8 w-full max-w-xl bg-neutral-900/90 relative overflow-auto"
>
  <slot />
</section>
