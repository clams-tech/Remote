<script lang="ts">
	export let label = ''
	export let toggled = false

	export let handleChange = (event: Event) => {}
</script>

<div class="cursor-pointer flex items-center">
	{#if label}<span>{label}</span>{/if}

	<label on:click|stopPropagation class="relative inline-block m-0 w-8 h-4">
		<input
			checked={toggled}
			class="opacity-0 w-0 h-0 peer"
			type="checkbox"
			on:change={handleChange}
		/>
		<span
			class="absolute cursor-pointer top-0 left-0 right-0 bottom-0 bg-neutral-300 peer-checked:bg-purple-500 peer-checked:before:translate-x-4 transition-all rounded-full before:h-3 before:w-3 before:left-[2px] before:bottom-[2px] before:absolute before:bg-white before:transition-all before:rounded-full before:shadow-sm slider"
		/>
	</label>
</div>
