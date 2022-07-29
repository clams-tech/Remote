<script lang="ts" context="module">
	import type { Load } from './__types/[id]'

	export const load: Load = ({ params, session }) => {
		if (!session.credentials) {
			const storedCredentials = getCredentialsFromStorage()

			if (storedCredentials) {
				session.credentials = storedCredentials
				return { props: { id: params.id } }
			} else {
				return {
					redirect: '/connect',
					status: 302
				}
			}
		}
	}
</script>

<script lang="ts">
	import { fade } from 'svelte/transition'
	import { lastPath$, payments$ } from '$lib/streams'
	import { goto } from '$app/navigation'
	import PaymentDetails from '$lib/components/PaymentDetails.svelte'
	import BackButton from '$lib/elements/BackButton.svelte'
	import { getCredentialsFromStorage } from '$lib/utils'

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
