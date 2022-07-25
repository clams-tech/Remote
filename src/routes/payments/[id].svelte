<script lang="ts" context="module">
	export function load({ session, params }) {
		// redirect to welcome page if not logged in
		return !session.token
			? {
					status: 302,
					redirect: '/welcome'
			  }
			: { props: { id: params.id } }
	}
</script>

<script lang="ts">
	import { fade } from 'svelte/transition'
	import { lastPath$, payments$ } from '$lib/streams'
	import { goto } from '$app/navigation'
	import PaymentDetails from '$lib/components/PaymentDetails.svelte'
	import BackButton from '$lib/elements/BackButton.svelte'

	export let id: string // payment id

	$: payment = $payments$?.find((p) => p.id === id)

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

<section in:fade class="flex flex-col justify-center items-start w-full max-w-xl">
	<BackButton on:click={handleClose} />

	{#if payment}
		<div class="flex w-full">
			<PaymentDetails {payment} />
		</div>
	{/if}
</section>
