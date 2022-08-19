<script lang="ts" context="module">
	import type { Load } from './__types/[id]'

	export const load: Load = ({ params }) => {
		if (!credentials$.getValue().connection) {
			return {
				redirect: '/welcome',
				status: 302
			}
		} else {
			return { props: { id: params.id } }
		}
	}
</script>

<script lang="ts">
	import { fade } from 'svelte/transition'
	import { credentials$, lastPath$, payments$ } from '$lib/streams'
	import { goto } from '$app/navigation'
	import PaymentDetails from '$lib/components/PaymentDetails.svelte'
	import BackButton from '$lib/elements/BackButton.svelte'
	import { t } from '$lib/i18n/translations'
	import Spinner from '$lib/elements/Spinner.svelte'

	export let id: string // payment id

	$: payment = $payments$.data && $payments$.data.find((p) => p.id === id)

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

<section in:fade class="flex flex-col justify-center items-center w-full h-full max-w-xl">
	<BackButton on:click={handleClose} />

	{#if $payments$.loading}
		<div class="w-full h-full flex items-center justify-center">
			<Spinner />
		</div>
	{:else if $payments$.error}
		<div class="w-full h-full flex items-center justify-center">
			<!-- @TODO - Render error correctly -->
			<span>{$payments$.error}</span>
		</div>
	{:else if payment}
		<div class="flex w-full h-full overflow-auto">
			<PaymentDetails {payment} />
		</div>
	{/if}
</section>
