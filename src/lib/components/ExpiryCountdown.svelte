<script lang="ts">
  import { filter, map, startWith, take, takeUntil, timer } from 'rxjs'
  import { translate } from '$lib/i18n/translations'
  import { formatCountdown } from '$lib/utils'
  import { settings$, onDestroy$ } from '$lib/streams'
  import { createEventDispatcher } from 'svelte'

  export let expiry: Date
  export let label = true
  export let small = true

  const dispatch = createEventDispatcher()

  const msToExpire$ = timer(0, 1000).pipe(
    map(() => {
      return formatCountdown({ date: expiry, language: settings$.getValue().language })
    }),
    takeUntil(onDestroy$),
    startWith('')
  )

  msToExpire$
    .pipe(
      filter((val) => val.includes('ago')),
      take(1)
    )
    .subscribe(() => {
      dispatch('expired')
    })

  // text-utility-error
  // text-small
</script>

<div class:text-sm={small} class:text-utility-error={$msToExpire$.includes('ago')}>
  {#if label}
    <span>{$translate(`app.labels.${$msToExpire$.includes('ago') ? 'expired' : 'expires'}`)}</span>
  {/if}
  <span>{$msToExpire$}</span>
</div>
