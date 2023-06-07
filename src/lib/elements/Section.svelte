<script>
  import { fade } from 'svelte/transition'
</script>

<section
  in:fade|local={{ duration: 250 }}
  class="flex flex-col justify-center items-center w-full p-8 bg-neutral-50/95 dark:bg-neutral-900/95"
>
  <div class="flex flex-col justify-start w-full p-4 max-w-lg">
    <slot />
  </div>
</section>
