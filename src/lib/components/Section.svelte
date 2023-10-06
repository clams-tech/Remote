<script>
  import { fade } from 'svelte/transition'
</script>

<section
  in:fade={{ duration: 250 }}
  class="rounded-lg px-4 pt-2 pb-4 xs:p-4 sm:p-6 md:p-8 w-full max-w-3xl bg-neutral-900/80 relative overflow-auto flex flex-col"
>
  <slot />
</section>
