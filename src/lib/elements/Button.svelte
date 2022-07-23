<script lang="ts">
	import Spinner from './Spinner.svelte'

	export let text: string = ''
	export let disabled = false
	export let requesting = false
	export let small = false
	export let primary = false

	// ==== 👇 comments are need to prevent styles from being stripped from build when used dynamically 👇 ==== //
	// px-2
	// hover:shadow-purple-500
	// hover:shadow-md
	// hover:shadow-current
</script>

<button
	on:click
	style={`opacity: ${disabled ? '0.4' : '1'}`}
	class="text-current no-underline text-{small ? 'xs' : 'base'} hover:shadow-{primary
		? 'purple-500'
		: 'current'} active:shadow-sm shadow-sm hover:shadow-md  disabled:bg-disabled disabled:border-disabled w-full flex items-center justify-center rounded-md py-3 px-{small
		? '2'
		: '4'} border-2 border-solid transition-all font-semibold {primary
		? 'border-purple-500'
		: 'border-current'}"
	disabled={disabled || requesting}
>
	{#if requesting}
		<Spinner size="1.5rem" />
	{:else}
		<slot name="iconLeft" />
		<span>
			{text}
		</span>
		<slot name="iconRight" />
	{/if}
</button>
