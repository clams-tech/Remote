<script lang="ts" context="module">
	export { load } from '$lib/utils'
</script>

<script lang="ts">
	import { goto } from '$app/navigation'
	import { fade } from 'svelte/transition'
	import Slide from '$lib/elements/Slide.svelte'
	import { Language } from '$lib/types'
	import SettingRow from '$lib/components/SettingRow.svelte'
	import { settings$ } from '$lib/streams'
	import Check from '$lib/icons/Check.svelte'
	import { t } from '$lib/i18n/translations'

	function setLanguage(lang: Language) {
		const currentSettings = settings$.value

		settings$.next({
			...currentSettings,
			language: lang
		})
	}
</script>

<svelte:head>
	<title>{$t('app.titles.settings_language')}</title>
</svelte:head>

<Slide
	back={() => {
		goto('/settings/app')
	}}
>
	<section in:fade class="w-full h-full">
		<h1 class="text-center my-4">Settings</h1>
		<div class="border-y border-neutral-70">
			{#each Object.entries(Language) as [key, val], index}
				{#if $settings$.language === val}
					<SettingRow label={val} {index}>
						<div class="w-7" slot="element">
							<Check />
						</div>
					</SettingRow>
				{:else}
					<div on:click={() => setLanguage(val)}>
						<SettingRow label={val} {index} />
					</div>
				{/if}
			{/each}
		</div>
	</section>
</Slide>
