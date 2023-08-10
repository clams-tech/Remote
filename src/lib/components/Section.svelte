<script>
  import { fade } from 'svelte/transition'
</script>

<section
  in:fade={{ duration: 250 }}
  class="rounded-lg px-2 pt-2 pb-4 xs:p-4 md:p-8 w-full max-w-2xl bg-neutral-900/80 relative overflow-auto flex flex-col"
>
  <slot />
</section>
