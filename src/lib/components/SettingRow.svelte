<script lang="ts">
	import { goto } from '$app/navigation'
	export let index: number = 0
	export let label: string
	export let route: string = ''
</script>

<div
	class="flex items-center justify-between"
	class:cursor-pointer={route}
	on:click={() => {
		if (route) {
			goto(route)
		}
	}}
>
	<div
		class="flex items-center justify-between w-full py-3 mx-6 border-neutral-70"
		class:border-t={index !== 0}
	>
		<p>{label}</p>
		{#if $$slots.element}
			<slot name="element" />
		{/if}
	</div>
</div>
