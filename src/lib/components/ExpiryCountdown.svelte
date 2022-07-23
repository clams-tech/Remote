<script lang="ts">
	import { t } from '$lib/i18n/translations'

	import { onDestroy$ } from '$lib/utils'

	import { map, takeUntil, takeWhile, timer } from 'rxjs'

	export let expiry: Date
	export let label = true

	const msToExpire$ = timer(0, 1000).pipe(
		map(() => {
			const msLeft = expiry.getTime() - Date.now()
			const msLeftDate = new Date(msLeft)
			const minutes = msLeftDate.getMinutes()
			const seconds = msLeftDate.getSeconds()

			return msLeft <= 1000
				? 'expired'
				: `${minutes < 10 ? `0${minutes}` : minutes}:${seconds < 10 ? `0${seconds}` : seconds}`
		}),
		takeWhile((val) => val !== 'expired', true),
		takeUntil(onDestroy$)
	)
</script>

{#if $msToExpire$ === 'expired'}
	<span class="text-utility-error">{$t('app.labels.expired')}</span>
{:else}
	{#if label}
		<span>{$t('app.labels.expires_in')}</span>
	{/if}
	<span>{$msToExpire$} {$t('app.time.mins')}</span>
{/if}
