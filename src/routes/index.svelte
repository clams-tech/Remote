<script lang="ts" context="module">
	export { load } from '$lib/utils'
</script>

<script lang="ts">
	import { fade } from 'svelte/transition'
	import { t } from '$lib/i18n/translations'
	import QRIcon from '$lib/icons/Qr.svelte'
	import ArrowIcon from '$lib/icons/Arrow.svelte'
	import ClamsLogo from '$lib/icons/ClamsLogo.svelte'
	import Link from '$lib/elements/Link.svelte'
	import { funds$, settings$ } from '$lib/streams'
	import { calculateBalance } from '$lib/utils'
	import Spinner from '$lib/elements/Spinner.svelte'
	import Value from '$lib/components/Value.svelte'
	import { convertValue } from '$lib/conversion'
	import { BitcoinDenomination } from '$lib/types'

	const buttons = [
		{ key: 'send', icon: ArrowIcon, props: { direction: 'up' } },
		{ key: 'scan', icon: QRIcon, props: {} },
		{ key: 'receive', icon: ArrowIcon, props: {} }
	]

	$: balanceMsat = $funds$.data && calculateBalance($funds$.data)
	$: balancePrimaryDenom =
		balanceMsat &&
		convertValue({
			value: balanceMsat,
			from: BitcoinDenomination.msats,
			to: $settings$.primaryDenomination
		})
</script>

<svelte:head>
	<title>{$t('app.titles.home')}</title>
</svelte:head>

<div in:fade class="h-full w-full flex flex-col items-center justify-center">
	<div class="w-1/3 max-w-xs">
		<ClamsLogo />
	</div>

	{#if $funds$.loading}
		<div class="p-6">
			<Spinner />
		</div>
	{:else if balancePrimaryDenom !== null}
		<Value value={balancePrimaryDenom} readonly />
	{/if}

	<div class="flex items-center justify-around w-full max-w-lg p-4 mt-4">
		{#each buttons as { key, icon, props } (key)}
			<a
				href={`/${key}`}
				class=" w-1/4 h-24 border rounded flex flex-col justify-center items-center"
			>
				<div class="w-12">
					<svelte:component this={icon} {...props} />
				</div>
				<div>{$t(`app.buttons.${key}`)}</div>
			</a>
		{/each}
	</div>

	<Link href="/payments">payments</Link>
	<Link href="/settings">settings</Link>
</div>
