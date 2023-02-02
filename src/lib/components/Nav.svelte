<script lang="ts">
  import { NAV_LINKS } from '$lib/constants'
  import clamsIcon from '$lib/icons/clamsIcon'
</script>

<div
  class="absolute flex md:tall:flex-col flex-row items-center justify-between md:tall:justify-start md:tall:items-start top-0 left-0 p-4 z-20 w-full md:tall:w-auto md:tall:h-full bg-neutral-50 dark:bg-neutral-800"
>
  <div class="w-20 group/sidebar">
    {@html clamsIcon}
  </div>

  <div
    class="flex md:tall:flex-col md:tall:px-6 md:tall:py-4 justify-end flex-wrap gap-2 group/sidebar"
  >
    {#each NAV_LINKS as link}
      <a
        href={link.route}
        class="flex items-center justify-center w-8 group/item sm:tall:group-hover/sidebar:w-32 transition-all overflow-hidden"
      >
        <div class="w-8 group-hover/item:text-purple-400 transition-all">
          {@html link.icon}
        </div>

        <div
          class="w-0 overflow-hidden sm:tall:group-hover/sidebar:w-24 sm:tall:group-hover/sidebar:pl-2 transition-all"
        >
          {link.title}
        </div>
      </a>
    {/each}
  </div>
</div>
