<script lang="ts" context="module">
	export { load } from '$lib/utils'
</script>

<script lang="ts">
	import { goto } from '$app/navigation'
	import { fade } from 'svelte/transition'
	import Slide from '$lib/elements/Slide.svelte'
	import { BitcoinDenomination } from '$lib/types'
	import SettingRow from '$lib/components/SettingRow.svelte'
	import { settings$ } from '$lib/streams'
	import Check from '$lib/icons/Check.svelte'
	import { t } from '$lib/i18n/translations'

	const bitcoinDenominations = [
		{ value: BitcoinDenomination.btc, label: 'Bitcoin (BTC, ₿)' },
		{ value: BitcoinDenomination.sats, label: 'Satoshi (SAT)' }
	]

	function setBitcoinUnit(key: BitcoinDenomination) {
		const currentSettings = settings$.value

		settings$.next({
			...currentSettings,
			bitcoinDenomination: BitcoinDenomination[key]
		})
	}
</script>

<svelte:head>
	<title>{$t('app.titles.settings_unit')}</title>
</svelte:head>

<Slide
	back={() => {
		goto('/settings/app')
	}}
>
	<section in:fade class="w-full h-full ">
		<h1 class="text-center my-4">{$t('app.settings.bitcoin_unit')}</h1>
		<div class="border-y border-neutral-70">
			{#each bitcoinDenominations as { value, label }, index}
				{#if $settings$.bitcoinDenomination === value}
					<SettingRow {label} {index}>
						<div class="w-7" slot="element">
							<Check />
						</div>
					</SettingRow>
				{:else}
					<div on:click={() => setBitcoinUnit(value)}>
						<SettingRow {label} {index} />
					</div>
				{/if}
			{/each}
		</div>
	</section>
</Slide>
