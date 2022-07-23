<script lang="ts">
	import { fly } from 'svelte/transition'
	import BackButton from './BackButton.svelte'

	export let back: () => void | null = null
	export let direction: 'left' | 'right' = 'left'

	function getValue() {
		const { innerWidth } = window
		return innerWidth > 500 ? 500 : innerWidth
	}

	const x = direction === 'left' ? getValue() : -getValue()
</script>

<div class="h-full w-full overflow-hidden">
	{#if back}
		<BackButton on:click={back} />
	{/if}

	<div in:fly={{ x }} class="flex items-center justify-center h-full overflow-hidden">
		<slot />
	</div>
</div>
