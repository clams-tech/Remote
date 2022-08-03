<script lang="ts" context="module">
	import type { Load } from '@sveltejs/kit'

	let loaded = false

	export const load: Load = async () => {
		if (!loaded) {
			loaded = true

			if (credentials$.getValue().connection) {
				return {
					redirect: '/',
					status: 302
				}
			}
		}
	}
</script>

<script lang="ts">
	import { t } from '$lib/i18n/translations'
	import { fade } from 'svelte/transition'
	import { goto } from '$app/navigation'
	import TextInput from '$lib/elements/TextInput.svelte'
	import Button from '$lib/elements/Button.svelte'
	import { credentials$ } from '$lib/streams'

	let connection = ''
	let rune = ''

	async function connect() {
		credentials$.next({ connection, rune })
		goto('/')
	}

	// @TODO - credentials validation
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
				name="connection"
				type="text"
				label="Node Connect"
				placeholder="02df5ffe895c778e10f7742a6c5b8a0cefbe9465df58b92fadeb883752c8107c8f@35.232.170.67:9735"
				bind:value={connection}
			/>

			<TextInput
				name="rune"
				type="text"
				label="Rune"
				placeholder="KUhZzNlECC7pYsz3QVbF1TqjIUYi3oyESTI7n60hLMs9MA=="
				bind:value={rune}
			/>

			<Button primary text={$t('app.buttons.connect')} on:click={connect} />
		</div>
	</div>
</div>
