<script lang="ts">
	import { fade } from 'svelte/transition'
	import Qr from '$lib/components/QR.svelte'
	import ExpiryCountdown from '$lib/components/ExpiryCountdown.svelte'
	import { BitcoinDenomination } from '$lib/types'
	import { bitcoinExchangeRates$, settings$ } from '$lib/streams'
	import { t } from '$lib/i18n/translations'
	import SummaryRow from '$lib/elements/SummaryRow.svelte'
	import Spinner from '$lib/elements/Spinner.svelte'
	import Copy from '$lib/icons/Copy.svelte'
	import Check from '$lib/icons/Check.svelte'

	import {
		convertValue,
		formatValueForDisplay,
		truncateValue,
		writeClipboardValue
	} from '$lib/utils'
	import Warning from '$lib/icons/Warning.svelte'

	export let payment

	const { primaryDenomination, secondaryDenomination } = settings$.value

	$: statusColor =
		status === 'completed'
			? 'success'
			: status === 'expired' || status === 'failed'
			? 'error'
			: 'pending'

	// $: primaryValue =
	// 	$bitcoinExchangeRates$ &&
	// 	convertValue({
	// 		value,
	// 		from: BitcoinDenomination.msats,
	// 		to: primaryDenomination
	// 	})

	// $: secondaryValue =
	// 	$bitcoinExchangeRates$ &&
	// 	convertValue({
	// 		value,
	// 		from: BitcoinDenomination.msats,
	// 		to: secondaryDenomination
	// 	})

	let copySuccess: string

	function handleCopy(value: string) {
		return async () => {
			const success = await writeClipboardValue(value)

			if (success) {
				copySuccess = value

				setTimeout(() => {
					if (copySuccess === value) {
						copySuccess = ''
					}
				}, 2000)
			}
		}
	}

	// text-utility-success
	// text-utility-pending
	// text-utility-error
</script>

<div class="w-full px-6 pt-12 pb-4">
	<!-- AMOUNT -->
	<div class="flex flex-col items-center justify-center">
		<!-- <span>{$t('app.payment.details.action', { status, direction })}</span>
		{#if primaryValue}
			<div in:fade class="flex flex-col items-end">
				<span
					class="text-3xl tracking-wider {direction === 'receive' && status === 'completed'
						? 'text-utility-success'
						: 'text-current'}"
					>{direction === 'receive' ? '+' : '-'}{formatValueForDisplay({
						value: primaryValue,
						denomination: primaryDenomination
					})}
					{primaryDenomination}</span
				>
				<span class="text-neutral-600"
					>{direction === 'receive' ? '+' : '-'}{formatValueForDisplay({
						value: secondaryValue,
						denomination: secondaryDenomination
					})}
					{secondaryDenomination}</span
				>
			</div>
		{:else}
			<Spinner />
		{/if} -->
	</div>

	<!-- QR AND EXPIRY COUNTDOWN -->
	<!-- {#if direction === 'receive' && status === 'pending'}
		<div class="my-4 flex flex-col items-center justify-center">
			<Qr value={request} />
			<div class="mt-2">
				<ExpiryCountdown expiry={new Date(expiresAt)} />
			</div>
		</div>
	{/if} -->

	<!--------------- DETAILS ----------------------->
	<!-- <div class="mt-8"> -->
	<!-- TO / REQUEST -->
	<!-- {#if direction === 'send'}
			{#if request}
				<SummaryRow on:click={handleCopy(request)}>
					<span class="cursor-pointer" slot="label">{$t('app.labels.invoice')}</span>
					<span class="flex items-center" slot="value">
						{truncateValue(request)}
						{#if copySuccess === request}
							<div in:fade class="w-6 text-utility-success">
								<Check />
							</div>
						{:else}
							<div in:fade class="w-6 cursor-pointer">
								<Copy />
							</div>
						{/if}
					</span>
				</SummaryRow>
			{:else}
				<SummaryRow on:click={handleCopy(destination)}>
					<span slot="label">{$t('app.labels.destination')}</span>
					<span slot="value" class="flex items-center">
						{destination.length > 30 ? truncateValue(destination) : destination}
						{#if copySuccess === destination}
							<div in:fade class="w-6 text-utility-success">
								<Check />
							</div>
						{:else}
							<div in:fade class="w-6 cursor-pointer">
								<Copy />
							</div>
						{/if}
					</span>
				</SummaryRow>
			{/if}
		{/if} -->

	<!-- STATUS -->
	<!-- <SummaryRow>
			<span slot="label">{$t('app.labels.status')}</span>
			<span class="text-utility-{statusColor} flex items-center" slot="value">
				{status}
				{#if status === 'pending'}
					<div class="ml-1">
						<Spinner size="1rem" />
					</div>
				{/if}

				{#if status === 'completed'}
					<div class="w-4 ml-1 border rounded-full">
						<Check />
					</div>
				{/if}

				{#if status === 'expired' || status == 'failed'}
					<div class="w-4 ml-1">
						<Warning />
					</div>
				{/if}
			</span>
		</SummaryRow> -->

	<!-- TIMESTAMP -->
	<!-- {#if completedAt}
			<SummaryRow>
				<span slot="label">{$t('app.labels.completed_at')}</span>
				<span slot="value">{completedAt}</span>
			</SummaryRow>
		{:else}
			<SummaryRow>
				<span slot="label">{$t('app.labels.created_started_at', { direction })}</span>
				<span slot="value">{startedAt}</span>
			</SummaryRow>
		{/if} -->

	<!-- DESCRIPTION -->
	<!-- {#if description}
			<SummaryRow>
				<span slot="label">{$t('app.labels.description')}</span>
				<span slot="value">{description}</span>
			</SummaryRow>
		{/if} -->

	<!-- PAYMENT HASH -->
	<!-- {#if hash}
			<SummaryRow on:click={handleCopy(hash)}>
				<span slot="label">{$t('app.labels.payment_id')}</span>
				<span class="flex items-center" slot="value">
					{truncateValue(hash)}
					{#if copySuccess === hash}
						<div in:fade class="w-6 text-utility-success">
							<Check />
						</div>
					{:else}
						<div in:fade class="w-6 cursor-pointer">
							<Copy />
						</div>
					{/if}
				</span>
			</SummaryRow>
		{/if} -->

	<!-- FEES -->
	<!-- {#if receiveFee || networkFee}
			<SummaryRow>
				<span slot="label"
					>{$t('app.labels.fee', { feeType: receiveFee ? 'receive' : 'network' })}</span
				>
				<span class="flex items-center" slot="value">
					{formatValueForDisplay({
						value: convertValue({
							value: receiveFee || networkFee,
							from: BitcoinDenomination.msats,
							to: primaryDenomination
						}),
						denomination: primaryDenomination
					})}
				</span>
			</SummaryRow>
		{/if}
	</div> -->
</div>
