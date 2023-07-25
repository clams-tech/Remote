<script>
  import { fade } from 'svelte/transition'
</script>

<section
  in:fade={{ duration: 250 }}
  class="rounded-lg px-2 pb-4 xs:px-4 xs:pt-2 xs:pb-6 md:pb-8 md:px-8 w-full max-w-xl bg-neutral-900/80 relative overflow-auto flex flex-col"
>
  <slot />
</section>
