<script lang="ts">
  import { fade, fly } from 'svelte/transition'
  import lightningIcon from '$lib/icons/lightning'
  import settingsIcon from '$lib/icons/settings'
  import graphIcon from '$lib/icons/graph'
  import { goto } from '$app/navigation'

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

  let width = 12
  let openNav = false

  function handleOpen() {
    width = 36
    openNav = true
  }

  function handleClose() {
    width = 12
    openNav = false
  }
</script>

<div class={`w-${width} absolute top-5 left-4`}>
  <!-- svelte-ignore a11y-mouse-events-have-key-events -->
  <div class="flex flex-col" on:mouseover={handleOpen} on:mouseout={handleClose}>
    {#each links as link}
      <div class="flex items-center">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <span class="mb-4 hover:cursor-pointer" on:click={() => goto(link.route)}>
          <div in:fade out:fade class="w-8 mr-2">
            {@html link?.icon}
          </div>
        </span>
        {#if openNav}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
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
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    in:fade
    out:fade
    class="w-8 ml-2 hover:cursor-pointer"
    on:click={() => {
      openNav = !openNav
    }}
  >
    >>
  </div>
</div>
