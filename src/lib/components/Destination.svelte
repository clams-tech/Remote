<script lang="ts">
	import lodashDebounce from 'lodash.debounce'
	import type { PaymentType } from '$lib/types'
	import TextInput from '$lib/elements/TextInput.svelte'
	import { onMount } from 'svelte'
	import Paste from '$lib/icons/Paste.svelte'
	import Button from '$lib/elements/Button.svelte'
	import Modal, { closeModal } from '../elements/Modal.svelte'
	import { t } from '$lib/i18n/translations'

	import {
		formatDecodedInvoice,
		getClipboardPermissions,
		readClipboardValue,
		getPaymentType
	} from '$lib/utils'
	import { modal$ } from '$lib/streams'
	import { Modals } from '$lib/types'

	export let value: string
	export let type: PaymentType | null
	export let description = ''
	export let expiry: number | null = null
	export let timestamp: number | null = null
	export let amount = ''
	export let next: () => void
	export let readonly = false

	let error = ''

	$: if (value) {
		error = ''
		type = getPaymentType(value) || null

		if (type === 'payment_request') {
			// try {
			// 	const decodedInvoice = decode(value)
			// 	;({ description, timestamp, expiry, amount } = formatDecodedInvoice(decodedInvoice))
			// } catch (e) {
			// 	error = $t('app.inputs.destination.invalid_invoice')
			// }
		}

		debouncedValidate()
	}

	function validate() {
		error = !value ? 'required' : !type ? $t('app.inputs.destination.error') : ''
	}

	const debouncedValidate = lodashDebounce(validate, 500)

	type ClipboardValue = { value: string; type: PaymentType }

	let clipboard: null | ClipboardValue
	let focusInput: () => void

	async function checkClipboard(): Promise<ClipboardValue | null> {
		const clipboardValue = await readClipboardValue()

		if (clipboardValue) {
			const paymentType = getPaymentType(clipboardValue)

			if (paymentType) {
				return {
					value: clipboardValue,
					type: paymentType
				}
			}
		}

		return null
	}

	async function paste() {
		const clipboardValue = await checkClipboard()

		if (clipboardValue) {
			value = clipboardValue.value
			type = clipboardValue.type
		}
	}

	onMount(async () => {
		// wait for animation to complete to focus
		setTimeout(focusInput, 500)

		if (value) return

		const clipboardPermission = await getClipboardPermissions()

		if (clipboardPermission) {
			setTimeout(async () => {
				clipboard = await checkClipboard()
				if (clipboard) {
					modal$.next(Modals.clipboard)
				}
			}, 250)
		}
	})
</script>

<section class="w-full max-w-lg p-4 h-full flex flex-col justify-between">
	<div class="w-full flex flex-col items-center">
		<h1 class="text-5xl mt-2 mb-8 pb-2 border-b-4 rounded border-b-purple-500">
			{$t('app.titles.send')}
		</h1>

		<TextInput
			bind:focus={focusInput}
			label={$t('app.inputs.destination.label')}
			hint={type ? $t('app.inputs.destination.hint', { paymentType: type }) : ''}
			placeholder={$t('app.inputs.destination.placeholder')}
			type="textarea"
			rows={8}
			bind:value
			name="to"
			{readonly}
			on:blur={validate}
			invalid={error}
		>
			<div on:click={paste} class="w-6 absolute right-2 bottom-2">
				<Paste />
			</div>
		</TextInput>
	</div>

	<Button on:click={next} text={$t('app.buttons.next')} primary disabled={!!error} />

	{#if $modal$ === Modals.clipboard && clipboard}
		<Modal>
			<div class="flex flex-col justify-center items-center">
				<p class="font-semibold mb-4 text-center">
					{$t('app.modals.clipboard.paragraph_one', { paymentType: clipboard.type })}
				</p>

				<p class="text-center text-neutral-600 text-sm">
					{$t('app.modals.clipboard.paragraph_two', { paymentType: clipboard.type })}
				</p>

				<div class="flex w-full items-center mt-4">
					<div class="w-1/2 mr-2">
						<Button on:click={closeModal} text={$t('app.buttons.no')} />
					</div>

					<div class="w-1/2">
						<Button
							on:click={() => {
								if (clipboard) {
									value = clipboard.value
									type = clipboard.type
									closeModal()
								}
							}}
							primary
							text={$t('app.buttons.yes')}
						/>
					</div>
				</div>
			</div>
		</Modal>
	{/if}
</section>
