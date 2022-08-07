<script lang="ts" context="module">
	export { load } from '$lib/utils'
</script>

<script lang="ts">
	import { goto } from '$app/navigation'
	import { fade } from 'svelte/transition'
	import Slide from '$lib/elements/Slide.svelte'
	import SettingRow from '$lib/components/SettingRow.svelte'
	import Caret from '$lib/icons/Caret.svelte'
	import { settings$ } from '$lib/streams'
	import Toggle from '$lib/elements/Toggle.svelte'
	import { t } from '$lib/i18n/translations'
	import Button from '$lib/elements/Button.svelte'
	import { CREDENTIALS_STORAGE_KEY } from '$lib/constants'

	let settings = [
		{ label: $t('app.settings.app'), route: '/settings/app' },
		{ label: $t('app.settings.help_and_support'), route: 'settings/help' },
		{ label: $t('app.settings.dark_mode') }
	]

	const toggleDarkmode = () => {
		const currentSettings = settings$.value

		settings$.next({
			...currentSettings,
			darkmode: !currentSettings.darkmode
		})
	}
</script>

<svelte:head>
	<title>{$t('app.titles.settings')}</title>
</svelte:head>

<Slide
	back={() => {
		goto('/')
	}}
>
	<section in:fade class="w-full h-full">
		<h1 class="text-center my-4">{$t('app.settings.settings')}</h1>
		<div class="border-y border-neutral-70">
			{#each settings as { label, route }, index}
				{#if label === 'Dark Mode'}
					<SettingRow {label} {index}>
						<Toggle slot="element" toggled={$settings$.darkmode} handleChange={toggleDarkmode} />
					</SettingRow>
				{:else}
					<SettingRow {label} {route} {index}>
						<div class="w-7" slot="element"><Caret direction="right" /></div>
					</SettingRow>
				{/if}
			{/each}
		</div>
		<div class="m-6">
			<Button
				text={$t('app.buttons.log_out')}
				on:click={() => {
					localStorage.removeItem(CREDENTIALS_STORAGE_KEY)
					window.location.reload()
				}}
			/>
		</div>
	</section>
</Slide>
