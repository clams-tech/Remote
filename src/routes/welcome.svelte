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
	import { fade } from 'svelte/transition'
	import { decode, type DecodedRune } from 'rune-decoder'
	import { goto } from '$app/navigation'
	import { t } from '$lib/i18n/translations'
	import TextInput from '$lib/elements/TextInput.svelte'
	import Button from '$lib/elements/Button.svelte'
	import { credentials$, updateCredentials } from '$lib/streams'
	import { coreLightning, type Socket } from '$lib/backends'
	import Spinner from '$lib/elements/Spinner.svelte'
	import { validateConnectionString } from '$lib/utils'
	import Check from '$lib/icons/Check.svelte'
	import Close from '$lib/icons/Close.svelte'
	import Arrow from '$lib/icons/Arrow.svelte'
	import Slide from '$lib/elements/Slide.svelte'

	type ConnectStatus = 'idle' | 'connecting' | 'success' | 'fail'
	type Step = 'connect' | 'rune'

	let step: Step = 'connect'

	let connection = ''
	let validConnection = false
	let connectStatus: ConnectStatus = 'idle'

	$: if (connection) {
		connectStatus = 'idle'
		validConnection = validateConnectionString(connection)
	}

	let rune = ''
	let decodedRune: DecodedRune | null = null

	$: if (rune) {
		decodedRune = decode(rune)
	}

	async function attemptConnect() {
		connectStatus = 'connecting'

		try {
			const connectOptions = coreLightning.connectionToConnectOptions(connection)

			const lnsocket = await Promise.race([
				coreLightning.connect(connectOptions),
				new Promise((res, reject) => setTimeout(reject, 5000))
			])

			connectStatus = 'success'
			;(lnsocket as Socket).destroy()
			updateCredentials({ connection })
		} catch (error) {
			connectStatus = 'fail'
		}
	}

	function saveRune() {
		updateCredentials({ rune })
		goto('/')
	}
</script>

<svelte:head>
	<title>{$t('app.titles.welcome')}</title>
</svelte:head>

<div class="p-4 w-full h-full flex flex-col items-center">
	<h1 class="text-lg w-full text-center mt-2 mb-8 pb-2 font-bold">
		{$t(`app.welcome.${step}`)}
	</h1>
	{#if step === 'connect'}
		<Slide>
			<div class="w-full flex flex-col justify-start items-center">
				<div class="w-full max-w-md flex flex-col items-center justify-center">
					<div class="relative w-full">
						<TextInput
							name="connection"
							type="textarea"
							rows={6}
							label="Address"
							invalid={rune && decodedRune === null ? 'Invalid rune' : ''}
							placeholder="02df5ffe895c778e10f7742a6c5b8a0cefbe9465df58b92fadeb883752c8107c8f@35.232.170.67:9735"
							bind:value={connection}
						/>

						<div in:fade class="flex items-center absolute bottom-10 right-2">
							{#if connectStatus === 'success'}
								<div class="w-6 text-utility-success">
									<Check />
								</div>
							{:else if connectStatus === 'fail'}
								<div class="w-6 text-utility-error">
									<Close />
								</div>
							{/if}
						</div>
					</div>

					{#if connectStatus === 'success'}
						<Button on:click={() => (step = 'rune')} text="Add a Rune">
							<div slot="iconRight" class="w-6">
								<Arrow direction="right" />
							</div>
						</Button>
					{:else}
						<Button
							disabled={!validConnection}
							on:click={attemptConnect}
							requesting={connectStatus === 'connecting'}
							text={$t(`app.welcome.${connectStatus}`)}
						/>
					{/if}
				</div>
			</div>
		</Slide>
	{/if}

	{#if step === 'rune'}
		<Slide>
			<div class="w-full flex flex-col justify-start items-center">
				<div class="w-full max-w-md flex flex-col items-center justify-center">
					<div class="relative w-full">
						<TextInput
							name="rune"
							type="textarea"
							rows={6}
							label="Rune"
							placeholder="7jN2zKjkWlvncm_La3uZc9vLVGLu7xl9oBoun6pth7E9MA=="
							bind:value={rune}
						/>
					</div>

					{#if decodedRune}
						<Button on:click={saveRune} text="Save">
							<div slot="iconRight" class="w-6">
								<Arrow direction="right" />
							</div>
						</Button>
					{/if}
				</div>
			</div>
		</Slide>
	{/if}
</div>
