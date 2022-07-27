<script lang="ts">
	import { fade } from 'svelte/transition'
	export let title = ''

	let isHovered = false
	let x: number
	let y: number

	function focus() {
		isHovered = true
	}

	function mouseOver(event: MouseEvent) {
		isHovered = true
		x = event.pageX + 5
		y = event.pageY + 5
	}

	function mouseMove(event: MouseEvent) {
		x = event.pageX + 5
		y = event.pageY + 5
	}

	function mouseLeave() {
		isHovered = false
	}
</script>

<div
	on:focus={focus}
	on:mouseover={mouseOver}
	on:blur={mouseLeave}
	on:mouseleave={mouseLeave}
	on:mousemove={mouseMove}
>
	<slot />
</div>

{#if isHovered}
	<div
		in:fade
		out:fade={{ duration: 50 }}
		style="top: {y}px; left: {x}px;"
		class="shadow-sm p-2 rounded bg-white absolute"
	>
		{title}
	</div>
{/if}
