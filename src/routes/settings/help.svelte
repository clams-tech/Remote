<script lang="ts" context="module">
	export { load } from '$lib/utils'
</script>

<script lang="ts">
	import { goto } from '$app/navigation'
	import { fade } from 'svelte/transition'
	import Slide from '$lib/elements/Slide.svelte'
	import Discord from '$lib/icons/Discord.svelte'
	import Twitter from '$lib/icons/Twitter.svelte'
	import { t } from '$lib/i18n/translations'

	let options = [
		{ label: $t('app.labels.community'), href: '@TODO', icon: Discord },
		{ label: '@clamstech', href: 'https://twitter.com/clamstech', icon: Twitter }
	]
</script>

<svelte:head>
	<title>{$t('app.titles.settings_help')}</title>
</svelte:head>

<Slide
	back={() => {
		goto('/settings')
	}}
>
	<section in:fade class="flex flex-col items-center justify-start w-full p-8 max-w-xl">
		<h1 class="text-lg w-full text-center mt-2 mb-6 font-bold">
			{$t('app.titles.settings_help')}
		</h1>
		<div class="w-full">
			{#each options as { label, href, icon }}
				<a class="mt-5 flex items-center w-full justify-center" {href}>
					{#if icon}
						<div class="w-12 mr-2">
							<svelte:component this={icon} />
						</div>
					{/if}
					{label}</a
				>
			{/each}
		</div>
	</section>
</Slide>
