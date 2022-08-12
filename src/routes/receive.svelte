<script lang="ts" context="module">
	export { load } from '$lib/utils'
</script>

<script lang="ts">
	import Amount from '$lib/components/Amount.svelte'
	import Description from '$lib/components/Description.svelte'
	import Summary from '$lib/components/Summary.svelte'
	import { settings$ } from '$lib/streams'
	import { SvelteSubject, waitForAndUpdatePayment, addPayment } from '$lib/utils'
	import { convertValue } from '$lib/conversion'
	import { goto } from '$app/navigation'
	import { BitcoinDenomination } from '$lib/types'
	import Slide from '$lib/elements/Slide.svelte'
	import { t } from '$lib/i18n/translations'
	import { coreLightning } from '$lib/backends'

	let requesting = false

	const { invoiceExpiry } = $settings$

	// @TODO - Display and handle error message
	let errorMsg = ''

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

	const receivePayment$ = new SvelteSubject({
		value: '0',
		description: '',
		expiry: invoiceExpiry
	})

	async function submit() {
		const { value, description, expiry } = $receivePayment$
		errorMsg = ''

		const amount_msat = convertValue({
			value,
			from: settings$.value.primaryDenomination,
			to: BitcoinDenomination.msats
		})

		if (!amount_msat) {
			errorMsg = 'Something went wrong, please try again'
			return
		}

		try {
			requesting = true

			const payment = await coreLightning.createInvoice({
				amount_msat,
				description,
				expiry,
				label: crypto.randomUUID()
			})

			// add to payments
			addPayment(payment)

			// track invoice payment
			waitForAndUpdatePayment(payment)

			console.log(payment.bolt11)

			// route to payment route
			goto(`/payments/${payment.id}`)
		} catch (error) {
			requesting = false
			errorMsg = (error as { message: string }).message
			console.log({ error })
		}
	}
</script>

<svelte:head>
	<title>{$t('app.titles.receive')}</title>
</svelte:head>

{#if slide === 0}
	<Slide
		back={() => {
			goto('/')
		}}
		direction={previousSlide > slide ? 'right' : 'left'}
	>
		<Amount bind:value={$receivePayment$.value} {next} direction="receive" />
	</Slide>
{/if}

{#if slide === 1}
	<Slide back={prev} direction={previousSlide > slide ? 'right' : 'left'}>
		<Description bind:description={$receivePayment$.description} {next} />
	</Slide>
{/if}

{#if slide === 2}
	<Slide back={prev} direction={previousSlide > slide ? 'right' : 'left'}>
		<Summary
			type="payment_request"
			value={$receivePayment$.value}
			description={$receivePayment$.description}
			bind:expiry={$receivePayment$.expiry}
			direction="receive"
			{requesting}
			on:complete={submit}
		/>
	</Slide>
{/if}
