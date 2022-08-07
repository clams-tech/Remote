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
	import { funds$, nodeInfo$, settings$ } from '$lib/streams'
	import { calculateBalance } from '$lib/utils'
	import Spinner from '$lib/elements/Spinner.svelte'
	import Value from '$lib/components/Value.svelte'
	import { convertValue } from '$lib/conversion'
	import { BitcoinDenomination } from '$lib/types'
	import Settings from '$lib/icons/Settings.svelte'

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

<div in:fade class="h-full w-full flex flex-col items-center justify-center relative">
	<a href="/settings">
		<div class="w-8 absolute top-2 right-2">
			<Settings />
		</div>
	</a>

	<a href="/" class="w-24 absolute top-1 left-1">
		<ClamsLogo />
	</a>

	{#if $nodeInfo$.data}
		<span style="border-color: #{$nodeInfo$.data.color};" class="px-2 py-1 rounded-md border-2"
			>{$nodeInfo$.data.alias}</span
		>
	{/if}

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
</div>
