<script lang="ts" context="module">
	export { load } from '$lib/utils'
</script>

<script lang="ts">
	import { goto } from '$app/navigation'
	import { fade } from 'svelte/transition'
	import Slide from '$lib/elements/Slide.svelte'
	import { FiatDenomination } from '$lib/types'
	import SettingRow from '$lib/components/SettingRow.svelte'
	import { settings$ } from '$lib/streams'
	import Check from '$lib/icons/Check.svelte'
	import { t } from '$lib/i18n/translations'

	const labels: Record<string, string> = {
		usd: 'US Dollar (USD, $)',
		eur: 'Eurozone Euro (EUR, €)',
		gbp: 'British Pound (GBP, £)',
		cny: 'Chinese Yuan Renminbi (CNY, 元)',
		jpy: 'Japanese Yen (JPY, ¥)',
		cad: 'Canadian Dollar (CAD, $)',
		aud: 'Australian Dollar	(AUD, $)',
		hkd: 'Hong Kong Dollar (HKD, $)',
		sgd: 'Singapore Dollar (SGD, $)',
		sek: 'Swedish Krona (SEK, kr)',
		chf: 'Swiss Franc (CHF, CHF)',
		thb: 'Thai Baht (THB, ฿)',
		pln: 'Polish Zloty (PLN, zł)',
		nok: 'Norwegian Krone (NOK, kr)',
		myr: 'Malaysian Ringgit (MYR, RM)',
		dkk: 'Danish Krone (DKK, kr)',
		zar: 'South African Rand (ZAR, R)',
		nzd: 'New Zealand Dollar (NZD, $)',
		mxn: 'Mexican Peso (MXN, $)',
		rub: 'Russian Ruble (RUB, ₽)'
	}

	function setLocalCurrency(val: FiatDenomination) {
		const currentSettings = settings$.value

		settings$.next({
			...currentSettings,
			fiatDenomination: val
		})
	}
</script>

<svelte:head>
	<title>{$t('app.titles.settings_currency')}</title>
</svelte:head>

<Slide
	back={() => {
		goto('/settings/app')
	}}
>
	<section in:fade class="w-full h-full">
		<h1 class="text-center my-4">{$t('app.settings.local_currency')}</h1>
		<div class="border-y border-neutral-70">
			<div class="flex py-3 px-6 border-b border-neutral-70">
				<p>{$t('app.settings.commonly_used')}</p>
			</div>
			{#each Object.entries(FiatDenomination) as [key, val], index}
				{#if index < 2}
					{#if $settings$.fiatDenomination === val}
						<SettingRow label={labels[key] || key} {index}>
							<div class="w-7" slot="element">
								<Check />
							</div>
						</SettingRow>
					{:else}
						<div on:click={() => setLocalCurrency(val)}>
							<SettingRow label={labels[key] || key} {index} />
						</div>
					{/if}
				{/if}
			{/each}
			<div class="flex py-3 px-6 border-y border-neutral-70">
				<p>{$t('app.settings.all_options')}</p>
			</div>
			{#each Object.entries(FiatDenomination).sort( ([a], [b]) => a.localeCompare(b) ) as [key, val], index}
				{#if $settings$.fiatDenomination === val}
					<SettingRow label={labels[key] || key} {index}>
						<div class="w-7" slot="element">
							<Check />
						</div>
					</SettingRow>
				{:else}
					<div on:click={() => setLocalCurrency(val)}>
						<SettingRow label={labels[key] || key} {index} />
					</div>
				{/if}
			{/each}
		</div>
	</section>
</Slide>
