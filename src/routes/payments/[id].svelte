<script lang="ts">
	import { fade } from 'svelte/transition'
	import { lastPath$ } from '$lib/streams'
	import { goto } from '$app/navigation'
	import BackButton from '$lib/elements/BackButton.svelte'
	import { t } from '$lib/i18n/translations'

	export let id: string // payment id

	function handleClose() {
		const path = lastPath$.value

		// for recently completed send or receive, we want to go home
		if (path === '/send' || path === '/receive' || path === '/scan') {
			goto('/')
		} else {
			goto(path)
		}
	}
</script>

<svelte:head>
	<title>{$t('app.titles.payment')}</title>
</svelte:head>

<section in:fade class="flex flex-col justify-center items-start w-full max-w-xl">
	<BackButton on:click={handleClose} />
</section>
