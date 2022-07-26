<script lang="ts" context="module">
	import type { Load } from '@sveltejs/kit'

	export const load: Load = async ({ session }) => {
		if (session.credentials) {
			return {
				redirect: '/',
				status: 302
			}
		}
	}
</script>

<script lang="ts">
	import { coreLightning } from '$lib/backends'
	import { t } from '$lib/i18n/translations'
	import { fade } from 'svelte/transition'
	import { goto } from '$app/navigation'
	import TextInput from '$lib/elements/TextInput.svelte'
	import Button from '$lib/elements/Button.svelte'
	import { session } from '$app/stores'
	import { CORE_LN_CREDENTIALS_DEFAULT } from '$lib/constants'

	$session.credentials = CORE_LN_CREDENTIALS_DEFAULT

	async function connect() {
		// @TODO - Validate credentials
		localStorage.setItem('credentials', JSON.stringify($session.credentials))
		await coreLightning.init()
		goto('/')
	}
</script>

<svelte:head>
	<title>{$t('app.titles.connect')}</title>
</svelte:head>

<div in:fade class="p-4 w-full h-full flex flex-col justify-center items-center">
	<div class="w-full flex flex-col items-start">
		<h1 class="text-5xl mt-2 mb-8 pb-2 border-b-4 rounded border-b-purple-500">
			{$t('app.titles.connect')}
		</h1>
		<div class="w-full max-w-md flex flex-col items-center justify-center">
			<TextInput
				name="publicKey"
				type="text"
				label="Node Public Key"
				placeholder="029c4b65fb91f9acb382cc904e995117f6c6b819fc1e4568e50249ce75ec45f260"
				bind:value={$session.credentials.publicKey}
			/>

			<TextInput
				name="protocol"
				type="text"
				label="Protocol"
				placeholder="ws:"
				bind:value={$session.credentials.protocol}
			/>

			<TextInput
				name="ip"
				type="text"
				label="IP Address"
				placeholder="122.198.29.182"
				bind:value={$session.credentials.ip}
			/>

			<TextInput
				name="port"
				type="number"
				label="Port"
				placeholder="9735"
				bind:value={$session.credentials.port}
			/>

			<TextInput
				name="rune"
				type="text"
				label="Rune"
				placeholder="KUhZzNlECC7pYsz3QVbF1TqjIUYi3oyESTI7n60hLMs9MA=="
				bind:value={$session.credentials.rune}
			/>

			<Button primary text={$t('app.buttons.connect')} on:click={connect} />
		</div>
	</div>
</div>
