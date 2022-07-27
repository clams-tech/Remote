<script lang="ts">
	import { goto } from '$app/navigation'
	import Arrow from '$lib/icons/Arrow.svelte'
	import type { Payment } from '$lib/types'
	import { settings$ } from '$lib/streams'
	import { BitcoinDenomination } from '$lib/types'
	import { formatValueForDisplay, formatDate } from '$lib/utils'
	import { convertValue } from '$lib/conversion'

	export let payment: Payment

	const { id, direction, value, startedAt } = payment

	$: primaryValue = convertValue({
		from: BitcoinDenomination.msats,
		to: $settings$.bitcoinDenomination,
		value
	})

	$: secondaryValue = convertValue({
		from: BitcoinDenomination.msats,
		to: $settings$.fiatDenomination,
		value
	})
</script>

<div
	on:click={() => goto(`/payments/${id}`)}
	class="flex items-center justify-between  p-4 border-t w-full cursor-pointer"
>
	<div class="flex items-center">
		<div
			class={direction === 'receive'
				? 'border rounded-full w-8 ml-2 mr-2'
				: 'border rounded-full w-8 ml-2 mr-2'}
		>
			<Arrow direction={direction === 'receive' ? 'down' : 'up'} />
		</div>
		<div class="flex flex-col">
			<span class="">{direction === 'receive' ? 'received' : 'sent'}</span>
			<span class="text-sm text-slate-400"
				>{formatDate({ date: startedAt, language: $settings$.language })}</span
			>
		</div>
	</div>

	<div class="flex flex-col text-right">
		<p class={direction === 'receive' ? 'text-utility-success' : ''}>
			{formatValueForDisplay({ denomination: $settings$.bitcoinDenomination, value: primaryValue })}
			{$settings$.bitcoinDenomination}
		</p>
		<p class="text-slate-400">
			{formatValueForDisplay({ denomination: $settings$.fiatDenomination, value: secondaryValue })}
			{$settings$.fiatDenomination}
		</p>
	</div>
</div>
