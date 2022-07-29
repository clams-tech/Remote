<script lang="ts" context="module">
	export { load } from '$lib/utils'
</script>

<script lang="ts">
	import { lastPath$, payments$ } from '$lib/streams'
	import { goto } from '$app/navigation'
	import { fade } from 'svelte/transition'
	import Slide from '$lib/elements/Slide.svelte'
	import PaymentRow from '$lib/components/PaymentRow.svelte'
	import TextInput from '$lib/elements/TextInput.svelte'
	import Checkbox from '$lib/elements/Checkbox.svelte'
	import Caret from '$lib/icons/Caret.svelte'
	import type { Payment } from '$lib/types'

	let showFilters = false

	let directionFilters: Record<string, boolean> = {
		receive: true,
		send: true
	}

	let statusFilters: Record<string, boolean> = {
		pending: true,
		complete: true,
		expired: true,
		failed: true
	}

	let searchTerm = ''
	let filteredPayments: Payment[] = []

	$: {
		filteredPayments = $payments$
			// direction
			?.filter(
				(payment) =>
					(directionFilters.send && payment.direction === 'send') ||
					(directionFilters.receive && payment.direction === 'receive')
			)
			// status
			?.filter(
				(payment) =>
					(statusFilters.pending && payment.status === 'pending') ||
					(statusFilters.complete && payment.status === 'complete') ||
					(statusFilters.expired && payment.status === 'expired') ||
					(statusFilters.failed && payment.status === 'failed')
			)
			// description
			.filter((payment) => payment.description?.toLowerCase().includes(searchTerm.toLowerCase()))
	}

	let sorts = ['newest', 'oldest', 'largest', 'smallest']
	let sortBy = 'newest'

	$: {
		if (sortBy === 'newest') {
			filteredPayments = filteredPayments?.sort((a, b) => {
				const dateA = new Date(a.startedAt)
				const timestampA = dateA.getTime()
				const dateB = new Date(b.startedAt)
				const timestampB = dateB.getTime()
				return timestampB - timestampA
			})
		}

		if (sortBy === 'oldest') {
			filteredPayments = filteredPayments?.sort((a, b) => {
				const dateA = new Date(a.startedAt)
				const timestampA = dateA.getTime()
				const dateB = new Date(b.startedAt)
				const timestampB = dateB.getTime()
				return timestampA - timestampB
			})
		}

		if (sortBy === 'largest') {
			filteredPayments = filteredPayments?.sort((a, b) => {
				return Number(b.value) - Number(a.value)
			})
		}

		if (sortBy === 'smallest') {
			filteredPayments = filteredPayments?.sort((a, b) => {
				return Number(a.value) - Number(b.value)
			})
		}
	}
</script>

<Slide
	back={() => {
		goto('/')
	}}
	direction={$lastPath$ && $lastPath$.includes('payments') ? 'right' : 'left'}
>
	<section in:fade class="flex flex-col items-center w-full p-8 max-w-xl">
		<h2 class="text-2xl font-bold mb-5">Payments</h2>

		<div class="mb-6 w-full">
			<div
				class="flex items-center justify-center underline cursor-pointer"
				on:click={() => (showFilters = !showFilters)}
			>
				<p>{showFilters ? 'Hide Filters ' : 'Show Filters '}</p>

				<div class="w-7">
					{#if showFilters}
						<Caret direction="down" />
					{:else}
						<Caret direction="up" />
					{/if}
				</div>
			</div>
			{#if showFilters}
				<div class="flex flex-col border p-4 mt-4">
					<!-- Filtering -->
					{#if $payments$?.some((payment) => payment.direction === 'send') && $payments$?.some((payment) => payment.direction === 'receive')}
						<p class="text-neutral-600 italic">Direction:</p>
						<div class="flex">
							{#each Object.keys(directionFilters) as direction}
								<div class="mr-2">
									<Checkbox
										name={direction}
										checked={directionFilters[direction]}
										label={direction}
										handleChange={() =>
											(directionFilters[direction] = !directionFilters[direction])}
									/>
								</div>
							{/each}
						</div>
					{/if}
					<p class="text-neutral-600 italic">Status:</p>
					<div class="flex flex-wrap">
						{#each Object.keys(statusFilters) as status}
							{#if $payments$?.some((payment) => payment.status === status)}
								<div class="mr-2">
									<Checkbox
										name={status}
										checked={statusFilters[status]}
										label={status}
										handleChange={() => (statusFilters[status] = !statusFilters[status])}
									/>
								</div>
							{/if}
						{/each}
					</div>
					<TextInput
						bind:value={searchTerm}
						placeholder="Filter by description"
						type="text"
						name="filter"
					/>
					<!-- Sorting -->
					<p class="text-neutral-600 italic">Sort by:</p>
					<div class="flex flex-wrap">
						{#each sorts as sort}
							<div class="mr-2">
								<Checkbox
									checked={sortBy === sort}
									name={sort}
									label={sort}
									handleChange={() => {
										sortBy = sort
									}}
								/>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		{#each filteredPayments as payment (payment.id)}
			<PaymentRow {payment} />
		{/each}
	</section>
</Slide>
