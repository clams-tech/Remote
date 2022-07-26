<script lang="ts" context="module">
	import type { Load } from '@sveltejs/kit'

	export const load: Load = async ({ url }) => {
		const { pathname } = url
		const defaultLocale = 'en'
		const initLocale = locale.get() || defaultLocale

		await loadTranslations(initLocale, pathname)

		return {}
	}
</script>

<script lang="ts">
	import { locale, loadTranslations } from '$lib/i18n/translations'
	import { beforeNavigate } from '$app/navigation'
	import { lastPath$ } from '$lib/streams'
	import '../app.css'
	import { coreLightning } from '$lib/backends'
	import Spinner from '$lib/elements/Spinner.svelte'
	import { session } from '$app/stores'

	beforeNavigate(({ from }) => {
		if (from) {
			lastPath$.next(from.pathname)
		}
	})

	let innerHeight = window.innerHeight
	let innerWidth = window.innerWidth

	let loading = true

	async function load() {
		if ($session.credentials) {
			await coreLightning.init()
		}

		loading = false
	}

	load()
</script>

<svelte:window bind:innerHeight bind:innerWidth />

<div
	style="width: {innerWidth}px; height: {innerHeight}px;"
	class="flex flex-col text-black dark:text-white dark:bg-black"
>
	<header class="flex px-2 py-2 fixed justify-end items-center top-0 w-full" />

	<!-- CONTENT -->
	<main class="flex flex-grow w-full flex-col items-center bg-inherit">
		{#if loading}
			<Spinner />
		{:else}
			<slot />
		{/if}
	</main>
</div>
