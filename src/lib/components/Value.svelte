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

	$: displayValue = value
		? formatValueForDisplay({
				value,
				denomination: settings$.value.primaryDenomination
		  })
		: '0'

	$: if (displayValue && input) {
		input.style.width = displayValue.length + 'ch'
	}

	let input: HTMLInputElement

	onMount(() => {
		setTimeout(() => {
			if (input) {
				input.value = displayValue
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
		? value !== '0'
			? convertValue({
					value,
					from: $settings$.primaryDenomination,
					to: $settings$.secondaryDenomination
			  })
			: value
		: '0'

	function handleInput(e: Event) {
		let { value: newValue } = e.target as HTMLInputElement
		const { data } = e as InputEvent
		const { primaryDenomination } = settings$.value
		const decimalIndex = newValue.indexOf('.')

		if (primaryDenomination === 'sats' && decimalIndex > 0) {
			input.value = newValue.slice(0, decimalIndex)
			return
		}

		if (
			data === null &&
			decimalIndex === -1 &&
			displayValue.includes('.') &&
			displayValue.slice(-1) !== '.'
		) {
			newValue = `${newValue}.`
		}

		if (data === '.') {
			if (primaryDenomination !== 'sats') {
				value = `${value}${data}`
			}

			return
		}

		if (newValue.length >= 10) {
			return
		}

		if (newValue && newValue.length > 1 && newValue[0] === '0') {
			if (newValue.indexOf('.') !== 1) {
				input.value = newValue.slice(1)
				newValue = input.value
			}
		}

		if (decimalIndex > 0 && newValue.slice(decimalIndex + 1).length > 2) {
			input.value = newValue.slice(0, decimalIndex + 3)
			return
		}

		value = newValue
	}
</script>

<div class="flex items-center p-4 w-full justify-center">
	<div class="flex flex-col items-end">
		<div class="flex items-center border-b-4 border-b-purple-500 pt-4 pb-2 rounded">
			<div class="flex items-end">
				<div class="relative flex items-center">
					<div class="text-5xl font-semibold cursor-pointer font-mono">{displayValue}</div>
					{#if !readonly}
						<input
							bind:this={input}
							on:input={handleInput}
							type="number"
							class="absolute caret-black dark:caret-white h-12 top-0 left-0 w-1 text-5xl border-none outline-none font-semibold bg-transparent text-transparent cursor-pointer font-mono"
						/>
					{/if}
				</div>
				<span class="ml-2 text-xl leading-1 font-semibold pb-1">
					{$settings$.primaryDenomination.toUpperCase()}
				</span>
			</div>
			<div
				on:click={switchDenomination}
				class="w-8 ml-6 p-1 box-content text-slate-400 hover:text-slate-600 hover:border-slate-600 transition-all rotate-90 cursor-pointer"
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
