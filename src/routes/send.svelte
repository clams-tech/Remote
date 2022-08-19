<script lang="ts" context="module">
	export { load } from '$lib/utils'
</script>

<script lang="ts">
	import { goto } from '$app/navigation'
	import Destination from '$lib/components/Destination.svelte'
	import Summary from '$lib/components/Summary.svelte'
	import Slide from '$lib/elements/Slide.svelte'
	import { BitcoinDenomination, type PaymentType } from '$lib/types'
	import { SvelteSubject, updatePayment } from '$lib/utils'
	import { convertValue } from '$lib/conversion'
	import { settings$ } from '$lib/streams'
	import Amount from '$lib/components/Amount.svelte'
	import Description from '$lib/components/Description.svelte'
	import { t } from '$lib/i18n/translations'
	import { coreLightning, type ErrorResponse } from '$lib/backends'
	import Big from 'big.js'

	let previousSlide = 0
	let slide = 0

	function next() {
		previousSlide = slide
		slide = slide + 1
	}

	function prev() {
		previousSlide = slide
		slide = slide - 1
	}

	function to(i: number) {
		slide = i
	}

	let requesting = false
	// @TODO - handle error message
	let errorMsg = ''

	type SendPayment = {
		destination: string
		type: PaymentType | null
		description: string
		expiry: number | null
		timestamp: number | null
		amount: string // invoice amount
		value: string // user input amount
	}

	const sendPayment$ = new SvelteSubject<SendPayment>({
		destination: '',
		type: null,
		description: '',
		expiry: null,
		timestamp: null,
		amount: '',
		value: '0'
	})

	async function sendPayment() {
		requesting = true
		const { destination, value, type } = sendPayment$.getValue()
		const { primaryDenomination } = $settings$

		try {
			let paymentId
			errorMsg = ''

			switch (type) {
				case 'payment_request': {
					const id = crypto.randomUUID()
					const payment = await coreLightning.payInvoice({
						id,
						bolt11: destination,
						amount_msat: value
							? Big(
									convertValue({
										value,
										from: primaryDenomination,
										to: BitcoinDenomination.msats
									}) as string
							  )
									.round()
									.toString()
							: undefined
					})

					updatePayment(payment)
					paymentId = payment.id

					break
				}
				case 'node_public_key': {
					const id = crypto.randomUUID()
					const payment = await coreLightning.payKeysend({
						id,
						destination,
						amount_msat: Big(
							convertValue({
								value,
								from: primaryDenomination,
								to: BitcoinDenomination.msats
							}) as string
						)
							.round()
							.toString()
					})

					updatePayment(payment)
					paymentId = payment.id

					break
				}
			}

			goto(`/payments/${paymentId}`)
		} catch (error) {
			requesting = false
			errorMsg = (error as ErrorResponse).message
			console.log('send payment error:', error)
		}
	}
</script>

<svelte:head>
	<title>{$t('app.titles.send')}</title>
</svelte:head>

{#if slide === 0}
	<Slide
		back={() => {
			goto('/')
		}}
		direction={previousSlide > slide ? 'right' : 'left'}
	>
		<Destination
			next={() =>
				$sendPayment$.type === 'payment_request' &&
				$sendPayment$.amount &&
				$sendPayment$.amount !== '0'
					? to(3)
					: next()}
			bind:value={$sendPayment$.destination}
			bind:type={$sendPayment$.type}
			bind:description={$sendPayment$.description}
			bind:expiry={$sendPayment$.expiry}
			bind:timestamp={$sendPayment$.timestamp}
			bind:amount={$sendPayment$.amount}
		/>
	</Slide>
{/if}

{#if slide === 1}
	<Slide back={prev} direction={previousSlide > slide ? 'right' : 'left'}>
		<Amount
			direction="send"
			bind:value={$sendPayment$.value}
			next={() => ($sendPayment$.description ? to(3) : next())}
			required
		/>
	</Slide>
{/if}

{#if slide === 2}
	<Slide back={prev} direction={previousSlide > slide ? 'right' : 'left'}>
		<Description {next} bind:description={$sendPayment$.description} />
	</Slide>
{/if}

{#if slide === 3}
	<Slide back={prev} direction={previousSlide > slide ? 'right' : 'left'}>
		<Summary
			direction="send"
			type={$sendPayment$.type}
			destination={$sendPayment$.destination}
			description={$sendPayment$.description}
			expiry={$sendPayment$.expiry}
			timestamp={$sendPayment$.timestamp}
			value={$sendPayment$.value ||
				convertValue({
					value: $sendPayment$.amount,
					from: BitcoinDenomination.msats,
					to: $settings$.primaryDenomination
				})}
			{requesting}
			on:complete={sendPayment}
		/>
	</Slide>
{/if}
