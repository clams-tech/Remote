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
		{ label: 'Community', href: '@TODO', icon: Discord },
		{ label: '@clamstech', href: 'https://twitter.com/clamstech', icon: Twitter },
		{ label: 'support@clams.tech', href: 'support@clams.tech' }
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
	<section in:fade class="w-full h-full">
		<h1 class="text-center my-4">Help & Support</h1>
		<div class="flex flex-col items-center border-y border-neutral-70 pb-5">
			{#each options as { label, href, icon }, index}
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
