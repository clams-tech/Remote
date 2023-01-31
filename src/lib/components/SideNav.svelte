<script lang="ts">
  import { fade, fly } from 'svelte/transition'
  import lightningIcon from '$lib/icons/lightning'
  import settingsIcon from '$lib/icons/settings'
  import graphIcon from '$lib/icons/graph'
  import { goto } from '$app/navigation'
  import { userAgent } from '$lib/utils'

  const device = userAgent!.getDevice()

  const links = [
    {
      title: 'Payments',
      icon: lightningIcon,
      route: '/payments'
    },
    {
      title: 'Bookkeeper',
      icon: graphIcon,
      route: '/bkpr'
    },
    {
      title: 'Settings',
      icon: settingsIcon,
      route: '/settings'
    }
  ]

  let openNav = false
</script>

<div class="absolute top-5 left-4 z-20">
  <div
    class="flex flex-col"
    on:mouseover={() => (openNav = true)}
    on:mouseleave={() => (openNav = false)}
  >
    {#each links as link}
      <div class="flex items-center">
        <div in:fade class="mb-4 hover:cursor-pointer w-8 mr-2" on:click={() => goto(link.route)}>
          {@html link.icon}
        </div>
        {#if openNav}
          <span
            class="flex items-center mb-4 hover:cursor-pointer"
            on:click={() => goto(link.route)}
            transition:fly={{ x: -36 }}
          >
            <p>{link.title}</p>
          </span>
        {/if}
      </div>
    {/each}
  </div>
  {#if device.type === 'mobile'}
    <div
      in:fade
      class="w-8 ml-2 hover:cursor-pointer"
      on:click={() => {
        openNav = !openNav
      }}
    >
      >>
    </div>
  {/if}
</div>
