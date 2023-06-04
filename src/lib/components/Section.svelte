<script>
  import { fade } from 'svelte/transition'
</script>

<section
  in:fade|local={{ duration: 250 }}
  class="flex flex-col justify-center items-center w-full p-8 bg-neutral-50/90 dark:bg-neutral-900/90"
>
  <slot />
</section>
