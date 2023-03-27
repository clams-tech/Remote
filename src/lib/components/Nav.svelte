<script lang="ts">
  import { NAV_LINKS } from '$lib/constants'
  import { translate } from '$lib/i18n/translations'
  import clamsIcon from '$lib/icons/clamsIcon'
  import lightning from '$lib/lightning'
  import { onDestroy } from 'svelte'
  import { fade } from 'svelte/transition'

  const lnAPI = lightning.getLn()
  const { connectionStatus$ } = lnAPI.connection

  let showConnectionStatus = true
  let timeout: NodeJS.Timeout | null = null

  $: if ($connectionStatus$ !== 'connected') {
    timeout && clearTimeout(timeout)
    showConnectionStatus = true
  } else {
    timeout = setTimeout(() => (showConnectionStatus = false), 3000)
  }

  onDestroy(() => timeout && clearTimeout(timeout))
</script>

<div
  class="absolute group/sidebar flex md:tall:flex-col flex-row items-center justify-between md:tall:justify-start md:tall:items-start top-0 left-0 p-4 z-20 w-full md:tall:w-auto md:tall:h-full md:tall:border-r border-neutral-100 md:tall:shadow-sm dark:border-neutral-700"
>
  <div class="flex items-center">
    <div class="w-16 md:tall:w-20">
      {@html clamsIcon}
    </div>

    <div
      in:fade|local
      class:w-0={!showConnectionStatus}
      class:w-28={showConnectionStatus}
      class="ml-2 overflow-hidden transition-all text-sm flex items-center dark:text-neutral-50/60 text-neutral-900/60"
    >
      {$translate('app.labels.connection_status', { status: $connectionStatus$ })}
      <div
        class:bg-utility-success={$connectionStatus$ === 'connected'}
        class:bg-utility-pending={$connectionStatus$ === 'connecting' ||
          $connectionStatus$ === 'waiting_reconnect' ||
          !$connectionStatus$}
        class:bg-utility-error={$connectionStatus$ === 'disconnected'}
        class="w-3 h-3 rounded-full ml-1 transition-colors"
      />
    </div>
  </div>

  <div
    class="flex md:tall:flex-col md:tall:px-6 md:tall:py-4 justify-end flex-wrap items-center gap-3 group/sidebar"
  >
    {#each NAV_LINKS as link}
      <a
        href={link.route}
        class="flex items-center justify-center w-8 group/item md:tall:group-hover/sidebar:w-28 group-hover/sidebar:w-auto transition-all overflow-hidden"
      >
        <div class="w-8 group-hover/item:text-purple-400 transition-all">
          {@html link.icon}
        </div>

        <div
          class="w-0 overflow-hidden md:tall:group-hover/sidebar:w-20 sm:group-hover/sidebar:pl-1 group-hover/sidebar:w-auto transition-all"
        >
          {link.title}
        </div>
      </a>
    {/each}
  </div>
</div>
