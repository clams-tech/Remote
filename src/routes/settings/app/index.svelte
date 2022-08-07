<script lang="ts" context="module">
	export { load } from '$lib/utils'
</script>

<script lang="ts">
	import { goto } from '$app/navigation'
	import { fade } from 'svelte/transition'
	import Slide from '$lib/elements/Slide.svelte'
	import SettingRow from '$lib/components/SettingRow.svelte'
	import { settings$ } from '$lib/streams'
	import Toggle from '$lib/elements/Toggle.svelte'
	import { t } from '$lib/i18n/translations'

	let settings = [
		{
			label: $t('app.settings.language'),
			route: '/settings/app/language',
			value: $settings$.language
		},
		{
			label: $t('app.settings.local_currency'),
			route: '/settings/app/currency',
			value: $settings$.fiatDenomination.toLocaleUpperCase()
		},
		{
			label: $t('app.settings.bitcoin_unit'),
			route: '/settings/app/unit',
			value: $settings$.bitcoinDenomination
		}
	]

	const toggleNotifications = () => {
		const currentSettings = settings$.value

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
	<section in:fade class="w-full h-full">
		<h1 class="text-center my-4">{$t('app.settings.app')}</h1>
		<div class="border-y border-neutral-70">
			{#each settings as { label, route, value }, index}
				<SettingRow {label} {route} {index}>
					<p slot="element" class="">{value}</p>
				</SettingRow>
			{/each}
			<div class="flex py-3 px-6 border-y border-neutral-70">
				<p>{$t('app.settings.notifications')}</p>
			</div>
			<SettingRow label={$t('app.settings.incoming_transactions')}>
				<Toggle
					slot="element"
					toggled={$settings$.notifications}
					handleChange={toggleNotifications}
				/>
			</SettingRow>
		</div>
	</section>
</Slide>
