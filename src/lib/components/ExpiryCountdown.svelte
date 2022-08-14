<script lang="ts">
	import { filter, map, startWith, take, takeUntil, timer } from 'rxjs'
	import { t } from '$lib/i18n/translations'
	import { formatCountdown, onDestroy$ } from '$lib/utils'
	import { settings$ } from '$lib/streams'
	import { createEventDispatcher } from 'svelte'

	export let expiry: Date
	export let label = true

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
</script>

<div class="text-sm" class:text-utility-error={$msToExpire$.includes('ago')}>
	{#if label}
		<span>{$t(`app.labels.${$msToExpire$.includes('ago') ? 'expired' : 'expires'}`)}</span>
	{/if}
	<span>{$msToExpire$}</span>
</div>
