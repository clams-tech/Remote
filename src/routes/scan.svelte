<script lang="ts">
	import Scanner from '$lib/components/Scanner.svelte'
	import { goto } from '$app/navigation'
	import { convertValue, formatDecodedInvoice, SvelteSubject } from '$lib/utils'
	import Slide from '$lib/elements/Slide.svelte'
	import Summary from '$lib/components/Summary.svelte'
	import { BitcoinDenomination } from '$lib/types'
	import { settings$ } from '$lib/streams'
	import { t } from '$lib/i18n/translations'

	let requesting = false
	let errorMsg = ''

	const sendPayment$ = new SvelteSubject({
		paymentRequest: '',
		description: '',
		expiry: null,
		amount: '0',
		timestamp: null
	})

	$: value = convertValue({
		value: $sendPayment$.amount,
		from: BitcoinDenomination.msats,
		to: $settings$.primaryDenomination
	})

	function handleScanResult(scanResult: string) {
		let invoice: string

		if (scanResult.includes(':')) {
			invoice = scanResult.split(':')[1]
		} else {
			invoice = scanResult
		}

		if (!invoice) {
			alert('Not a valid Lightning invoice.')
			return
		}

		try {
			// const decodedInvoice = decode(invoice)
			// const { paymentRequest, description, expiry, amount, timestamp } =
			// 	formatDecodedInvoice(decodedInvoice)
			// sendPayment$.next({
			// 	paymentRequest,
			// 	description,
			// 	expiry,
			// 	amount,
			// 	timestamp
			// })
			// next()
		} catch (error) {
			console.log({ error })
		}
	}

	async function sendPayment() {
		const { paymentRequest } = sendPayment$.getValue()

		errorMsg = ''
		requesting = true

		try {
			// @TODO send payment
			// goto(`/payments/${payment.id}`)
		} catch (error) {
			errorMsg = (error as { message: string }).message
		} finally {
			requesting = false
		}
	}

	let previousSlide = 0
	let slide = 0

	function next() {
		if (slide === 1) return
		previousSlide = slide
		slide = slide + 1
	}

	function prev() {
		previousSlide = slide
		slide = slide - 1
	}
</script>

<svelte:head>
	<title>{$t('app.titles.scan')}</title>
</svelte:head>

{#if slide === 0}
	<Slide
		back={() => {
			goto('/')
		}}
		direction={previousSlide > slide ? 'right' : 'left'}
	>
		<Scanner onResult={handleScanResult} />
	</Slide>
{/if}

{#if slide === 1}
	<Slide back={prev} direction={previousSlide > slide ? 'right' : 'left'}>
		<Summary
			destination={$sendPayment$.paymentRequest}
			type="payment_request"
			{value}
			description={$sendPayment$.description}
			timestamp={$sendPayment$.timestamp}
			direction="send"
			expiry={$sendPayment$.expiry}
			on:complete={sendPayment}
			{requesting}
		/>
	</Slide>
{/if}
