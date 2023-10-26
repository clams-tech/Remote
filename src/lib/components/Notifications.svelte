<script lang="ts">
  import { filter, switchMap, takeUntil } from 'rxjs/operators'
  import { flip } from 'svelte/animate'
  import { fly, fade } from 'svelte/transition'
  import { DIRECTION_UP } from 'hammerjs'
  import { quintOut } from 'svelte/easing'
  import { onDestroy$, settings$ } from '$lib/streams'
  import close from '$lib/icons/close'
  import { drag, swipe } from '$lib/touch'
  import { noop } from '$lib/utils'
  import type { Notification } from '$lib/@types/common.js'
  import { notifications$ } from '$lib/services.js'

  function elasticOut(t: number): number {
    return Math.sin((-13.0 * (t + 1.0) * Math.PI) / 2) * Math.pow(2.0, -35.0 * t) + 1.0
  }

  let notificationsToRender: Notification[] = []
  let containerHeight: number

  settings$
    .pipe(
      filter(({ notifications }) => !!notifications),
      switchMap(() => notifications$),
      takeUntil(onDestroy$)
    )
    .subscribe(async notification => {
      const idIndex = notificationsToRender.findIndex(({ id }) => notification.id === id)

      // if id already exists, then just replace with update
      if (idIndex !== -1) {
        notificationsToRender = notificationsToRender.map((n, i) =>
          i === idIndex ? notification : n
        )
      } else {
        // otherwise add to end
        notificationsToRender = [...notificationsToRender, notification]
      }
    })

  function removeNotification(id: Notification['id']): void {
    notificationsToRender = notificationsToRender.filter(notification => notification.id !== id)
  }

  let innerWidth: number
</script>

<svelte:window bind:innerWidth />

{#if notificationsToRender.length}
  <div
    class="fixed top-0 p-2 max-h-screen overflow-hidden w-full"
    class:max-w-sm={innerWidth >= 450}
    class:overflow-y-auto={containerHeight && containerHeight >= window.innerHeight}
    bind:clientHeight={containerHeight}
    class:right-0={innerWidth > 450}
  >
    {#each notificationsToRender as { id, heading, message, onclick = noop } (id)}
      <button
        use:swipe={{
          direction: DIRECTION_UP,
          threshold: 30,
          velocity: 0.2
        }}
        on:swipe={() => removeNotification(id)}
        use:drag={{ direction: DIRECTION_UP, threshold: 0, maxDrag: 50 }}
        on:click={onclick}
        animate:flip={{ duration: 700 }}
        in:fly|={{ duration: 1200, x: 0, y: -50, easing: elasticOut }}
        out:fade={{ duration: 500, easing: quintOut }}
        class="w-full cursor-grab shadow-md shadow-neutral-600 border bg-neutral-900 text-neutral-50 border-neutral-400 z-20 p-4 relative rounded-lg mb-2 block text-start"
      >
        <button
          on:click|stopPropagation={() => removeNotification(id)}
          class="absolute top-0 right-0 w-9 p-1 cursor-pointer"
        >
          {@html close}
        </button>

        <div class="flex items-start w-full">
          <div class="w-12 mr-4 flex-shrink-0">
            <img src="/icons/icon.png" class="w-full" alt="Clams" />
          </div>

          <div class="w-4/5">
            <h4 class="font-bold leading-4">{heading}</h4>
            <p class="text-sm break-words">{message}</p>
          </div>
        </div>
      </button>
    {/each}
  </div>
{/if}
