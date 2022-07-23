<script lang="ts">
	export let direction: 'up' | 'down' | 'right' | 'left' = 'down'

	const rotateStyle =
		direction === 'up'
			? 'rotate-180'
			: direction === 'left'
			? 'rotate-90'
			: direction === 'right'
			? '-rotate-90'
			: ''
</script>

<svg
	width="100%"
	height="100%"
	class={rotateStyle}
	viewBox="0 0 30 30"
	fill="none"
	xmlns="http://www.w3.org/2000/svg"
>
	<path
		d="M21.6633 16.8333L14.9967 23.5L8.33 16.8333"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
	<line
		x1="15"
		y1="21.8333"
		x2="15"
		y2="6.49999"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	/>
</svg>
