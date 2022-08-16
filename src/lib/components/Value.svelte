<script lang="ts">
	import Exchange from '$lib/icons/Exchange.svelte'
	import { settings$ } from '$lib/streams'
	import { formatValueForDisplay } from '$lib/utils'
	import { convertValue } from '$lib/conversion'
	import { onMount } from 'svelte'

	/**
	 * value must be converted to primaryDenomination when passed in
	 */
	export let value: string
	export let readonly = false

	$: if (value && input) {
		input.style.width = value.length + 'ch'
	}

	let input: HTMLInputElement

	onMount(() => {
		setTimeout(() => {
			if (input) {
				input.value = value
				input.focus()
			}
		}, 500)
	})

	function switchDenomination() {
		const currentSettings = settings$.value

		settings$.next({
			...currentSettings,
			primaryDenomination: currentSettings.secondaryDenomination,
			secondaryDenomination: currentSettings.primaryDenomination
		})

		value = secondaryValue as string

		if (input) {
			input.value = formatValueForDisplay({
				value,
				denomination: currentSettings.secondaryDenomination
			})

			input.focus()
			input.scrollIntoView()
		}
	}

	$: secondaryValue = value
		? value !== '0' && value !== '0.'
			? convertValue({
					value,
					from: $settings$.primaryDenomination,
					to: $settings$.secondaryDenomination
			  })
			: value
		: '0'

	function handleInput(e: Event) {
		const { data } = e as InputEvent

		// backspace, so remove last value
		if (data === null) {
			const newValue = value.length === 1 ? '0' : value.slice(0, -1)
			value = newValue
			input.value = newValue

			return
		}

		const { primaryDenomination } = settings$.value

		// handle invalid input
		if (
			// not a number or decimal point
			!/[0-9.]/.test(data) ||
			// sats cannot have decimals, so remove
			(primaryDenomination === 'sats' && data === '.') ||
			// max length
			value.length >= 9 ||
			// no double decimal points
			(data === '.' && value.includes('.'))
		) {
			input.value = value
			return
		}

		// remove leading 0 if not decimal
		if (value.length && value[0] === '0' && value[1] !== '.' && data !== '.') {
			input.value = data
			value = data
			return
		}

		value = `${value}${data}`
	}
</script>

<div class="flex items-center p-4 w-full justify-center">
	<div class="flex flex-col items-end">
		<div class="flex items-center border-b-4 border-b-purple-500 pt-4 pb-2 rounded">
			<div class="flex items-end">
				<div class="relative flex items-center">
					<div class="text-4xl font-semibold cursor-pointer font-mono">{value}</div>
					{#if !readonly}
						<input
							bind:this={input}
							on:input={handleInput}
							type="number"
							class="absolute caret-black dark:caret-white h-12 top-0 left-0 w-1 text-4xl border-none outline-none font-semibold bg-transparent text-transparent cursor-pointer font-mono"
						/>
					{/if}
				</div>
				<span class="ml-2 text-lg leading-1 font-semibold pb-1">
					{$settings$.primaryDenomination.toUpperCase()}
				</span>
			</div>
			<div
				on:click={switchDenomination}
				class="w-6 ml-6 p-1 box-content text-slate-400 hover:text-slate-600 hover:border-slate-600 transition-all rotate-90 cursor-pointer"
			>
				<Exchange />
			</div>
		</div>

		<div
			class="cursor-pointer text-slate-400 hover:text-slate-600 mt-3"
			on:click={switchDenomination}
		>
			<span class="text-base font-mono">
				{formatValueForDisplay({
					value: secondaryValue,
					denomination: $settings$.secondaryDenomination
				})}
			</span>
			<span class="text-xs">
				{$settings$.secondaryDenomination.toUpperCase()}
			</span>
		</div>
	</div>
</div>
