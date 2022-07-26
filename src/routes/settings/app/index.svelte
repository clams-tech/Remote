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
			label: 'Language',
			route: '/settings/app/language',
			value: $settings$.language
		},
		{
			label: 'Local currency',
			route: '/settings/app/currency',
			value: $settings$.fiatDenomination.toLocaleUpperCase()
		},
		{
			label: 'Bitcoin unit',
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
	<section in:fade class="w-full h-full dark:bg-neutral-800">
		<h1 class="text-center my-4">App</h1>
		<div class="border-y border-neutral-70">
			{#each settings as { label, route, value }, index}
				<SettingRow {label} {route} {index}>
					<p slot="element" class="text-neutral-400 dark:text-neutral-200">{value}</p>
				</SettingRow>
			{/each}
			<div class="flex py-3 px-6 border-y border-neutral-70">
				<p>Notifications</p>
			</div>
			<SettingRow label="Incoming transactions">
				<Toggle
					slot="element"
					toggled={$settings$.notifications}
					handleChange={toggleNotifications}
				/>
			</SettingRow>
		</div>
	</section>
</Slide>
