<script lang="ts">
	import { browser } from '$app/env'
	import { coreLightning, type CoreLnCredentials } from '$lib/backends'
	import { t } from '$lib/i18n/translations'
	import { fade } from 'svelte/transition'
	import { goto } from '$app/navigation'
	import Spinner from '$lib/elements/Spinner.svelte'
	import TextInput from '$lib/elements/TextInput.svelte'
	import { credentials$ } from '$lib/streams'
	import Button from '$lib/elements/Button.svelte'
	import { CORE_LN_CREDENTIALS_DEFAULT } from '$lib/constants'

	// on load:
	// check for credentials in storage

	// if credentials then ask for pin entry to decrypt credentials
	// once decrypted initialise connection to node and fetch data

	// if no credentials then render connect/login screen

	let loading = true

	function checkCredentials() {
		if (browser) {
			const storedCredentials = localStorage.getItem('credentials')

			const credentials: CoreLnCredentials | null = storedCredentials
				? JSON.parse(storedCredentials)
				: null

			if (credentials?.rune) {
				credentials$.next(credentials)
				connect()
			} else {
				credentials$.next(CORE_LN_CREDENTIALS_DEFAULT)
				loading = false
			}
		}
	}

	checkCredentials()

	async function connect() {
		localStorage.setItem('credentials', JSON.stringify(credentials$.getValue()))
		await coreLightning.init()
		goto('/')
	}
</script>

<svelte:head>
	<title>{$t('app.titles.connect')}</title>
</svelte:head>

<div in:fade class="p-4 w-full h-full flex flex-col justify-center items-center">
	{#if loading}
		<Spinner />
	{:else if $credentials$}
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
					bind:value={$credentials$.publicKey}
				/>

				<TextInput
					name="protocol"
					type="text"
					label="Protocol"
					placeholder="ws:"
					bind:value={$credentials$.protocol}
				/>

				<TextInput
					name="ip"
					type="text"
					label="IP Address"
					placeholder="122.198.29.182"
					bind:value={$credentials$.ip}
				/>

				<TextInput
					name="port"
					type="number"
					label="Port"
					placeholder="9735"
					bind:value={$credentials$.port}
				/>

				<TextInput
					name="rune"
					type="text"
					label="Rune"
					placeholder="KUhZzNlECC7pYsz3QVbF1TqjIUYi3oyESTI7n60hLMs9MA=="
					bind:value={$credentials$.rune}
				/>

				<Button primary text={$t('app.buttons.connect')} on:click={connect} />
			</div>
		</div>
	{/if}
</div>
