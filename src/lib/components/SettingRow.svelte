<script lang="ts">
	import { goto } from '$app/navigation'
	export let index = 0
	export let label: string
	export let route = ''
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
		class="flex items-center justify-between w-full py-3 mx-6 border-neutral-100"
		class:border-t={index !== 0}
	>
		<p>{label}</p>
		{#if $$slots.element}
			<slot name="element" />
		{/if}
	</div>
</div>
