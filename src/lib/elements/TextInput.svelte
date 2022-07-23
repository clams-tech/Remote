<script lang="ts">
	import Warning from '$lib/icons/Warning.svelte'

	type InputType = 'text' | 'number' | 'textarea' | 'password' | 'email'

	export let type: InputType = 'text'
	export let value: string | number
	export let label: string = ''
	export let name: string
	export let invalid = ''
	export let placeholder = ''
	export let hint = ''
	export let width = '100%'
	export let disabled = false
	export let readonly = false
	export let rows = 1
	export let maxlength = 1000

	export const focus = () => input && input.focus()
	export const select = () => input && input.select()

	let input: HTMLInputElement | HTMLTextAreaElement

	$: styles = `flex items-center bg-transparent placeholder:text-neutral-400 w-full autofill:bg-transparent font-medium px-4 py-[14px] border border-neutral-200 dark:border-neutral-50 rounded read-only:border-0 read-only:outline-0 focus-visible:outline-${
		invalid ? 'utility-error' : 'purple-500'
	}`

	// ==== 👇 comments are need to prevent styles from being stripped from build when used dynamically 👇 ==== //
	// focus-visible:outline-purple-500
	// focus-visible:outline-utility-error
	// text-neutral-300
	// text-inherit
	// h-0
	// read-only:border-0
	// read-only:outline-0
	// autofill:bg-transparent
</script>

<div style="width: {width};" class="flex flex-col relative mb-6">
	{#if label || hint}
		<div class="flex items-center mb-2 font-medium">
			<label class="text-sm w-1/2 text-{disabled ? 'neutral-300' : 'inherit'}" for={name}
				>{label || ''}</label
			>
			<span class="flex justify-end text-neutral-400 text-xs w-1/2">{hint}</span>
		</div>
	{/if}

	<div class="relative flex items-center">
		{#if type === 'text'}
			<input
				bind:this={input}
				on:blur
				on:input
				on:focus
				{readonly}
				{name}
				{placeholder}
				{disabled}
				class={styles}
				type="text"
				bind:value
			/>
		{:else if type === 'number'}
			<input
				bind:this={input}
				on:blur
				on:input
				on:focus
				{readonly}
				{name}
				{placeholder}
				{disabled}
				class={styles}
				type="number"
				inputmode="numeric"
				pattern="\d*"
				bind:value
			/>
		{:else if type === 'textarea'}
			<textarea
				bind:this={input}
				on:blur
				on:input
				on:focus
				{readonly}
				{name}
				{placeholder}
				{disabled}
				class={styles}
				{rows}
				{maxlength}
				bind:value
			/>
		{:else if type === 'email'}
			<input
				bind:this={input}
				on:blur
				on:input
				on:focus
				{readonly}
				{name}
				{placeholder}
				{disabled}
				class={styles}
				type="email"
				bind:value
			/>
		{:else}
			<input
				bind:this={input}
				on:blur
				on:input
				on:focus
				{readonly}
				{name}
				{placeholder}
				{disabled}
				class={styles}
				type="password"
				bind:value
			/>
		{/if}

		<slot />
	</div>

	<div
		class="flex items-center mt-2 transition-all overflow-hidden text-utility-error h-{invalid
			? '4'
			: '0'}"
	>
		<span class="w-4 mr-2"><Warning /></span>
		<span class="text-xs font-medium">{invalid}</span>
	</div>
</div>
