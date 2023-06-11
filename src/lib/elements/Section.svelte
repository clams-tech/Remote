<script>
  import { fade } from 'svelte/transition'
</script>

<section
  in:fade|local={{ duration: 250 }}
  class="md:rounded-lg px-3 py-4 md:p-8 w-full max-w-xl bg-neutral-50/95 dark:bg-neutral-900/90 relative"
>
  <slot />
</section>
