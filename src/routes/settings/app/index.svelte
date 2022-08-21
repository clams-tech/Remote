<script lang="ts" context="module">
	export { load } from '$lib/utils'
</script>

<script lang="ts">
	import { goto } from '$app/navigation'
	import { fade } from 'svelte/transition'
	import Slide from '$lib/elements/Slide.svelte'
	import { settings$ } from '$lib/streams'
	import Toggle from '$lib/elements/Toggle.svelte'
	import { t } from '$lib/i18n/translations'
	import SummaryRow from '$lib/elements/SummaryRow.svelte'

	let settings = [
		{
			label: $t('app.labels.language'),
			route: '/settings/app/language',
			value: $settings$.language
		},
		{
			label: $t('app.labels.local_currency'),
			route: '/settings/app/currency',
			value: $settings$.fiatDenomination.toLocaleUpperCase()
		},
		{
			label: $t('app.labels.bitcoin_unit'),
			route: '/settings/app/unit',
			value: $settings$.bitcoinDenomination
		}
	]

	const toggleNotifications = async () => {
		const currentSettings = settings$.value

		if (currentSettings.notifications === false) {
			try {
				await Notification.requestPermission()
			} catch (error) {
				//
			}
		}

		settings$.next({
			...currentSettings,
			notifications: !currentSettings.notifications
		})
	}
</script>

<svelte:head>
	<title>{$t('app.titles.settings_app')}</title>
</svelte:head>

<Slide
	back={() => {
		goto('/settings')
	}}
>
	<section in:fade class="flex flex-col items-center justify-center w-full p-8 max-w-xl">
		<h1 class="text-lg w-full text-center mt-2 mb-6 font-bold">
			{$t('app.titles.settings_app')}
		</h1>
		<div class="w-full">
			{#each settings as { label, route, value }}
				<a href={route}>
					<SummaryRow>
						<span slot="label">{label}</span>
						<p slot="value" class="">{value}</p>
					</SummaryRow>
				</a>
			{/each}
			<SummaryRow>
				<span slot="label">{$t('app.labels.notifications')}</span>
				<Toggle
					slot="value"
					toggled={$settings$.notifications}
					handleChange={toggleNotifications}
				/>
			</SummaryRow>
		</div>
	</section>
</Slide>
