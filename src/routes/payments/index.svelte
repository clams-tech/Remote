<script lang="ts" context="module">
	export { load } from '$lib/utils'
</script>

<script lang="ts">
	import Fuse from 'fuse.js'
	import { lastPath$, payments$ } from '$lib/streams'
	import { goto } from '$app/navigation'
	import { fade } from 'svelte/transition'
	import Slide from '$lib/elements/Slide.svelte'
	import PaymentRow from '$lib/components/PaymentRow.svelte'
	import TextInput from '$lib/elements/TextInput.svelte'
	import { t } from '$lib/i18n/translations'
	import Spinner from '$lib/elements/Spinner.svelte'
	import type { Payment } from '$lib/types'
	import Search from '$lib/icons/Search.svelte'

	let searchTerm = ''
	let searcher: Fuse<Payment>
	let filteredPayments: Payment[] = []

	$: payments = $payments$.data

	$: if (payments) {
		filteredPayments = payments

		searcher = new Fuse(payments, {
			keys: ['description', 'status', 'direction', 'type', 'value'],
			ignoreLocation: true
		})
	}

	$: if (searchTerm) {
		filteredPayments = searcher.search(searchTerm).map(({ item }) => item)
	} else {
		filteredPayments = payments || []
	}
</script>

<svelte:head>
	<title>{$t('app.titles.payments')}</title>
</svelte:head>

<Slide
	back={() => {
		goto('/')
	}}
	direction={$lastPath$ && $lastPath$.includes('payments') ? 'right' : 'left'}
>
	<section in:fade class="flex flex-col items-center justify-start w-full p-4 max-w-xl">
		<h1 class="text-lg w-full text-center mt-2 pb-2 font-bold">
			{$t('app.titles.payments')}
		</h1>

		<div class="w-full mt-2 mb-6 relative flex items-center shadow-md">
			<TextInput bind:value={searchTerm} placeholder="Search" type="text" name="filter" />
			<div class="absolute right-1 w-8 text-neutral-400"><Search /></div>
		</div>

		{#if $payments$.loading}
			<Spinner />
		{:else if $payments$.error}
			<!-- @TODO - Render error correctly -->
			<span>{$payments$.error}</span>
		{:else if filteredPayments}
			<div class="w-full overflow-auto">
				{#each filteredPayments as payment (payment.id)}
					<PaymentRow {payment} />
				{/each}
			</div>
		{/if}
	</section>
</Slide>
