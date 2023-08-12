<script lang="ts">
  import { filter, mergeMap, startWith, take, takeUntil, timer } from 'rxjs'
  import { translate } from '$lib/i18n/translations'
  import { settings$, onDestroy$ } from '$lib/streams'
  import { createEventDispatcher } from 'svelte'
  import { formatCountdown } from '$lib/dates.js'

  export let expiry: number
  export let label = true

  const date = new Date(expiry * 1000)

  const dispatch = createEventDispatcher()

  const msToExpire$ = timer(0, 1000).pipe(
    mergeMap(() => {
      return formatCountdown({ date, language: settings$.getValue().language })
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
</script>

<div class:text-utility-error={$msToExpire$.includes('ago')}>
  {#if label}
    <span>{$translate(`app.labels.${$msToExpire$.includes('ago') ? 'expired' : 'expires'}`)}</span>
  {/if}
  <span>{$msToExpire$}</span>
</div>
