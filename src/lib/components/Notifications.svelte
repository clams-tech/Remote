<script lang="ts">
  import { merge, type Observable } from 'rxjs'
  import { filter, withLatestFrom, map, switchMap, takeUntil } from 'rxjs/operators'
  import { flip } from 'svelte/animate'
  import { fly, fade } from 'svelte/transition'
  import { DIRECTION_UP } from 'hammerjs'
  import { quintOut } from 'svelte/easing'
  import { customNotifications$, onDestroy$, paymentUpdates$, settings$ } from '$lib/streams'
  import { translate } from '$lib/i18n/translations'
  import { convertValue } from '$lib/conversion'
  import type { Notification } from '$lib/@types/util.js'
  import check from '$lib/icons/check'
  import info from '$lib/icons/info'
  import alert from '$lib/icons/alert'
  import close from '$lib/icons/close'
  import { drag, swipe } from '$lib/touch'
  import { BitcoinDenomination } from '$lib/@types/settings.js'

  import {
    formatValueForDisplay,
    notificationsPermissionsGranted,
    supportsNotifications
  } from '$lib/utils'

  function elasticOut(t: number): number {
    return Math.sin((-13.0 * (t + 1.0) * Math.PI) / 2) * Math.pow(2.0, -35.0 * t) + 1.0
  }

  let notificationsToRender: Notification[] = []
  let containerHeight: number

  // map payment updates to notification
  const paymentUpdateNotifications$: Observable<Notification> = paymentUpdates$.pipe(
    filter(({ status }) => status !== 'pending'),
    withLatestFrom(settings$),
    map(([payment, settings]) => {
      const { status, direction, value, description, hash } = payment
      const { primaryDenomination } = settings

      const convertedValue = convertValue({
        value,
        from: BitcoinDenomination.msats,
        to: primaryDenomination
      })

      const message = `${$translate('app.payment.status', {
        direction,
        status
      })} ${formatValueForDisplay({
        value: convertedValue,
        denomination: primaryDenomination
      })} ${primaryDenomination}${description ? ` for ${description}` : ''}`

      const type = status === 'expired' || status === 'failed' ? 'error' : 'success'

      return {
        id: hash,
        type,
        heading: $translate('app.titles./payment'),
        message
      }
    })
  )

  const newNotifications$ = merge(paymentUpdateNotifications$, customNotifications$)

  settings$
    .pipe(
      filter(({ notifications }) => !!notifications),
      switchMap(() => newNotifications$),
      takeUntil(onDestroy$)
    )
    .subscribe(async (notification) => {
      if (!supportsNotifications() || !notificationsPermissionsGranted()) {
        // if device does not support notifications, or the permissions have not been granted
        // then add to list of notifications to be rendered by app

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
      } else {
        // otherwise try and use browser notifications
        try {
          new Notification(notification.heading, {
            body: notification.message,
            icon: '/icons/android-chrome-256x256.png'
          })
        } catch (error) {
          //
        }
      }
    })

  function removeNotification(id: Notification['id']): void {
    notificationsToRender = notificationsToRender.filter((notification) => notification.id !== id)
  }

  let innerWidth: number
</script>

<svelte:window bind:innerWidth />

{#if notificationsToRender.length}
  <div
    class="absolute top-0 p-4 max-h-screen overflow-hidden w-full"
    class:max-w-sm={innerWidth > 450}
    class:overflow-y-auto={containerHeight && containerHeight >= window.innerHeight}
    bind:clientHeight={containerHeight}
    class:right-0={innerWidth > 450}
  >
    {#each notificationsToRender as { id, heading, message, type } (id)}
      <div
        on:swipe={() => removeNotification(id)}
        use:swipe={{
          direction: DIRECTION_UP,
          threshold: 30,
          velocity: 0.2
        }}
        use:drag={{ direction: DIRECTION_UP, threshold: 0, maxDrag: 50 }}
        animate:flip={{ duration: 700 }}
        in:fly={{ duration: 1200, x: 0, y: -50, easing: elasticOut }}
        out:fade={{ duration: 500, easing: quintOut }}
        class="w-full cursor-grab bg-neutral-900 shadow-md shadow-neutral-600 border border-neutral-400 z-20 p-4 relative rounded-lg mb-2"
      >
        <button
          on:click={() => removeNotification(id)}
          class="absolute top-0 right-0 w-9 p-1 cursor-pointer"
        >
          {@html close}
        </button>

        <div class="flex items-start w-full">
          <div
            class="w-6 border-2 border-current rounded-full mr-4 flex-shrink-0"
            class:text-utility-success={type === 'success'}
            class:text-utility-error={type === 'error'}
          >
            {#if type === 'success'}
              {@html check}
            {:else if type === 'hint'}
              {@html info}
            {:else}
              {@html alert}
            {/if}
          </div>

          <div class="w-4/5">
            <h4 class="font-bold leading-4 mb-2">{heading}</h4>
            <p class="text-sm break-words">{message}</p>
          </div>
        </div>
      </div>
    {/each}
  </div>
{/if}
