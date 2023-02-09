<script lang="ts">
  import { NAV_LINKS } from '$lib/constants'
  import clamsIcon from '$lib/icons/clamsIcon'
</script>

<div
  class="absolute group/sidebar flex md:tall:flex-col flex-row items-center justify-between md:tall:justify-start md:tall:items-start top-0 left-0 p-4 z-20 w-full md:tall:w-auto md:tall:h-full md:tall:border-r border-neutral-100 md:tall:shadow-sm dark:border-neutral-700"
>
  <div class="w-16 md:tall:w-20">
    {@html clamsIcon}
  </div>

  <div
    class="flex md:tall:flex-col md:tall:px-6 md:tall:py-4 justify-end flex-wrap gap-2 group/sidebar"
  >
    {#each NAV_LINKS as link}
      <a
        href={link.route}
        class="flex items-center justify-center w-8 group/item sm:group-hover/sidebar:w-32 transition-all overflow-hidden"
      >
        <div class="w-8 group-hover/item:text-purple-400 transition-all">
          {@html link.icon}
        </div>

        <div
          class="w-0 overflow-hidden sm:group-hover/sidebar:w-24 sm:group-hover/sidebar:pl-2 transition-all"
        >
          {link.title}
        </div>
      </a>
    {/each}
  </div>
</div>
