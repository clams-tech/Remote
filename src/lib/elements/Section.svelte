<script>
  import { fade } from 'svelte/transition'
</script>

<section
  in:fade|local={{ duration: 250 }}
  class="flex flex-col justify-center items-center rounded-lg p-8 w-full max-w-xl bg-neutral-50/90 dark:bg-neutral-900/90 relative"
>
  <div class="flex flex-col justify-start w-full p-4">
    <slot />
  </div>
</section>
