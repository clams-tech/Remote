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
	import { credentials$ } from '$lib/streams'
	import { coreLightning, type Socket } from '$lib/backends'
	import { truncateValue, validateConnectionString, updateCredentials } from '$lib/utils'
	import Check from '$lib/icons/Check.svelte'
	import Close from '$lib/icons/Close.svelte'
	import Arrow from '$lib/icons/Arrow.svelte'
	import Slide from '$lib/elements/Slide.svelte'
	import SummaryRow from '$lib/elements/SummaryRow.svelte'
	import Warning from '$lib/icons/Warning.svelte'
	import { onMount } from 'svelte'

	type ConnectStatus = 'idle' | 'connecting' | 'success' | 'fail'
	type Step = 'connect' | 'rune'

	let focusConnectionInput: () => void
	let focusRuneInput: () => void

	onMount(async () => {
		// wait for animation to complete to focus
		setTimeout(focusConnectionInput, 500)
	})

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
				new Promise((res, reject) => setTimeout(reject, 10000))
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

{#if step === 'connect'}
	<Slide>
		<section class="flex flex-col justify-center items-start w-full p-8 max-w-xl">
			<div class="mb-6">
				<h1 class="text-4xl font-bold mb-4">{$t('app.headings.connect')}</h1>
				<p class="text-neutral-600 italic">{$t('app.subheadings.connect')}</p>
			</div>
			<div class="w-full">
				<div class="relative w-full flex flex-col">
					<TextInput
						name="connection"
						type="textarea"
						rows={6}
						label={$t('app.inputs.node_connect.label')}
						invalid={connection && !validConnection ? $t('app.inputs.node_connect.invalid') : ''}
						placeholder={$t('app.inputs.node_connect.placeholder')}
						bind:value={connection}
						bind:focus={focusConnectionInput}
					/>

					<div in:fade class="flex items-center text-sm absolute bottom-1 right-1">
						{#if connectStatus === 'success'}
							<div class="flex items-center">
								<span class="text-utility-success">{$t('app.inputs.add_rune.success')}</span>
								<div class="w-6 text-utility-success">
									<Check />
								</div>
							</div>
						{:else if connectStatus === 'fail'}
							<div class="flex items-center">
								<span class="text-utility-error">{$t('app.errors.node_connect')}</span>
								<div class="w-6 text-utility-error">
									<Close />
								</div>
							</div>
						{/if}
					</div>
				</div>

				<div class="w-full mt-6">
					{#if connectStatus === 'success'}
						<Button
							on:click={() => {
								step = 'rune'
								setTimeout(focusRuneInput, 500)
							}}
							text={$t('app.buttons.add_rune')}
						>
							<div slot="iconRight" class="w-6">
								<Arrow direction="right" />
							</div>
						</Button>
					{:else}
						<Button
							disabled={!validConnection}
							on:click={attemptConnect}
							requesting={connectStatus === 'connecting'}
							text={$t(`app.buttons.${connectStatus === 'idle' ? 'connect' : 'try_again'}`)}
						/>
					{/if}
				</div>
			</div>
		</section>
	</Slide>
{/if}

{#if step === 'rune'}
	<Slide
		back={() => {
			step = 'connect'
		}}
	>
		<section class="flex flex-col justify-center items-start w-full p-8 max-w-xl">
			<div class="mb-6">
				<h1 class="text-4xl font-bold mb-4">{$t('app.headings.rune')}</h1>
				<p class="text-neutral-600 italic">{$t('app.subheadings.rune')}</p>
			</div>

			<div class="w-full">
				<div class="relative w-full">
					<TextInput
						name="rune"
						type="textarea"
						rows={6}
						label={$t('app.inputs.add_rune.label')}
						placeholder={$t('app.inputs.add_rune.placeholder')}
						bind:value={rune}
						bind:focus={focusRuneInput}
					/>
				</div>

				{#if decodedRune}
					<div in:fade class="w-full mt-6">
						<h4 class="font-semibold mb-4">{$t('app.headings.rune')}</h4>

						<SummaryRow>
							<span slot="label">{$t('app.labels.id')}</span>
							<span slot="value">{decodedRune.id}</span>
						</SummaryRow>

						<SummaryRow>
							<span slot="label">{$t('app.labels.hash')}</span>
							<span slot="value">{truncateValue(decodedRune.hash)}</span>
						</SummaryRow>

						<SummaryRow>
							<span slot="label">{$t('app.labels.restrictions')}</span>
							<p slot="value">
								{#if decodedRune.restrictions.length === 0}
									<div class="flex items-center">
										<div class="w-4 mr-2 text-utility-pending">
											<Warning />
										</div>
										<span class="text-utility-pending">{$t('app.hints.unrestricted')}</span>
									</div>
								{:else}
									{@html decodedRune.restrictions
										.map(({ summary }) => {
											const alternatives = summary.split(' OR ')

											return alternatives
												.map((alternative) => {
													const words = alternative.split(' ')
													const wordsBold = words.map((w, i) =>
														i === 0 || i === words.length - 1 ? `<b>${w}</b>` : w
													)

													return wordsBold.join(' ')
												})
												.join('<i><br>OR<br></i>')
										})
										.join('<i><br>AND<br></i>')}
								{/if}
							</p>
						</SummaryRow>
					</div>
				{/if}

				<div class="mt-6">
					<Button on:click={saveRune} text={$t('app.buttons.save')} disabled={!decodedRune}>
						<div slot="iconRight" class="w-6">
							<Arrow direction="right" />
						</div>
					</Button>
				</div>
			</div>
		</section>
	</Slide>
{/if}
