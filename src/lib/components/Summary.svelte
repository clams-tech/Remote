<script lang="ts">
	import { MIN_IN_SECS } from '$lib/constants'
	import Button from '$lib/elements/Button.svelte'
	import SummaryRow from '$lib/elements/SummaryRow.svelte'
	import { t } from '$lib/i18n/translations'
	import type { PaymentType } from '$lib/types'
	import { settings$ } from '$lib/streams'
	import { formatDestination, formatValueForDisplay } from '$lib/utils'
	import { createEventDispatcher } from 'svelte'
	import ExpiryCountdown from './ExpiryCountdown.svelte'

	export let type: PaymentType | null
	export let destination: string | null = ''
	export let direction: 'send' | 'receive'
	export let value: string | null
	export let description: string = ''
	export let expiry: number | null
	export let timestamp: number | null = null
	export let requesting: boolean

	$: expiryMinutes = expiry && expiry / MIN_IN_SECS

	const expiresAt = timestamp ? (timestamp + (expiry || $settings$.invoiceExpiry)) * 1000 : null
	const dispatch = createEventDispatcher()

	function updateExpiry(event: Event) {
		const { value } = event.target as HTMLInputElement

		const invoiceExpiry = parseInt(value) * MIN_IN_SECS

		expiry = invoiceExpiry

		const currentSettings = settings$.value

		settings$.next({
			...currentSettings,
			invoiceExpiry
		})
	}
</script>

<section class="flex flex-col justify-between w-full h-full px-4 pb-4 pt-12 max-w-xl">
	<div>
		<h1 class="font-bold text-lg mb-8 w-full text-center">
			{$t('app.payment.summary.heading', { direction })}
		</h1>

		<!-- DESTINATION -->
		{#if direction === 'send' && destination}
			<SummaryRow>
				<span slot="label">{$t('app.payment.summary.destination')}</span>
				<span slot="value">
					{#if type}
						{formatDestination(destination, type)}
					{/if}
				</span>
			</SummaryRow>
		{/if}

		<!-- AMOUNT -->
		<SummaryRow>
			<span slot="label">{$t('app.payment.summary.amount')}</span>
			<span slot="value">
				{#if value}
					{formatValueForDisplay({ value, denomination: $settings$.primaryDenomination })}
					{$settings$.primaryDenomination}
				{/if}
			</span>
		</SummaryRow>

		<!-- DESCRIPTION -->
		<SummaryRow>
			<span slot="label">{$t('app.payment.summary.description')}</span>
			<span slot="value">
				{description}
			</span>
		</SummaryRow>

		<!-- EXPIRY -->
		<SummaryRow>
			<span slot="label">{$t('app.payment.summary.expiry')}</span>
			<span class="flex items-center" slot="value">
				{#if direction === 'receive'}
					<input
						class="h-2 bg-purple-50 appearance-none mr-4 accent-purple-500 dark:accent-purple-300"
						type="range"
						min="1"
						max="60"
						bind:value={expiryMinutes}
						on:change={updateExpiry}
					/>
					{expiryMinutes}
					{$t('app.time.mins')}
				{:else if expiresAt}
					<ExpiryCountdown label={false} expiry={new Date(expiresAt)} />
				{/if}
			</span>
		</SummaryRow>
	</div>

	<div class="mt-6">
		<Button
			{requesting}
			primary
			disabled={!!(expiresAt && Date.now() >= expiresAt)}
			text={$t(`app.buttons.${direction === 'receive' ? 'create_invoice' : 'send_payment'}`)}
			on:click={() => dispatch('complete')}
		/>
	</div>
</section>
