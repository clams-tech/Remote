<script lang="ts">
  import { merge, Observable } from 'rxjs'
  import { filter, withLatestFrom, map, switchMap, takeUntil } from 'rxjs/operators'
  import { flip } from 'svelte/animate'
  import { fly } from 'svelte/transition'
  import { DIRECTION_RIGHT, DIRECTION_UP } from 'hammerjs'
  import { quintOut } from 'svelte/easing'
  import { customNotifications$, onDestroy$, paymentUpdates$, settings$ } from '$lib/streams'
  import { translate } from '$lib/i18n/translations'
  import { convertValue } from '$lib/conversion'
  import { BitcoinDenomination, type Notification } from '$lib/types'
  import Close from '$lib/icons/Close.svelte'
  import { drag } from '$lib/utils'

  import {
    formatValueForDisplay,
    notificationsPermissionsGranted,
    supportsNotifications,
    swipe,
    userAgent
  } from '$lib/utils'

  function elasticOut(t: number): number {
    return Math.sin((-13.0 * (t + 1.0) * Math.PI) / 2) * Math.pow(2.0, -35.0 * t) + 1.0
  }

  let notificationsToRender: Notification[] = []

  setTimeout(() => {
    notificationsToRender = [
      {
        id: crypto.randomUUID(),
        heading: 'Test',
        message: 'This is a test notifications',
        type: 'hint'
      }
    ]
  }, 1000)

  const device = userAgent.getDevice()

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
      })} for ${description || 'unknown'}`

      const type = status === 'expired' || status === 'failed' ? 'error' : 'success'

      return {
        id: hash,
        type,
        heading: $translate('app.titles.payment'),
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
        notificationsToRender = [...notificationsToRender, notification]
      } else {
        // otherwise try and use browser notifications
        try {
          new Notification(notification.heading, {
            body: notification.message,
            icon: '/clams-icon.png'
          })
        } catch (error) {
          //
        }
      }
    })

  function removeNotification(id: Notification['id']): void {
    notificationsToRender = notificationsToRender.filter((notification) => notification.id !== id)
  }
</script>

{#if notificationsToRender.length}
  <div class:w-full={device.type === 'mobile'} class="absolute top-0 right-0 p-4">
    {#each notificationsToRender as { id, heading, message, type } (id)}
      <div
        use:swipe={{
          direction: device.type === 'mobile' ? DIRECTION_UP : DIRECTION_RIGHT,
          threshold: 50,
          velocity: 0.4
        }}
        on:swipe={() => removeNotification(id)}
        use:drag={{ direction: DIRECTION_UP, threshold: 0, maxDrag: 50 }}
        animate:flip={{ duration: 500 }}
        in:fly={{ duration: 1200, x: 0, y: -50, easing: elasticOut }}
        out:fly={{ duration: 400, x: 0, y: -50, easing: quintOut }}
        class="w-full bg-neutral-50 dark:bg-neutral-900 shadow-md dark:shadow-neutral-600 dark:border dark:border-neutral-400 z-20 p-4 relative rounded-lg"
      >
        <div on:click={() => removeNotification(id)} class="absolute top-0 right-0 w-8 p-1">
          <Close />
        </div>
        <h4>{heading}</h4>
        <p>{message}</p>
      </div>
    {/each}
  </div>
{/if}
