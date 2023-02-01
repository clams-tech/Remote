<script lang="ts">
  import { fade, fly } from 'svelte/transition'
  import { goto } from '$app/navigation'
  import { userAgent } from '$lib/utils'
  import ClamsLogo from '$lib/icons/ClamsLogo.svelte'
  import { NAV_LINKS } from '$lib/constants'

  const device = userAgent!.getDevice()

  let openNav = false
</script>

<div class="absolute top-5 left-4 z-20">
  <div class="w-24">
    <ClamsLogo disableAnimation />
  </div>
  {#if device.type !== 'mobile'}
    <div
      class="flex flex-col"
      on:mouseover={() => (openNav = true)}
      on:mouseleave={() => (openNav = false)}
    >
      {#each NAV_LINKS as link}
        <div class="flex items-center">
          <div in:fade class="mt-4 hover:cursor-pointer w-8 mr-2" on:click={() => goto(link.route)}>
            {@html link.icon}
          </div>
          {#if openNav}
            <span
              class="flex items-center mt-4 hover:cursor-pointer"
              on:click={() => goto(link.route)}
              transition:fly={{ x: -36 }}
            >
              <p>{link.title}</p>
            </span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
