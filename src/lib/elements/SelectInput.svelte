<script lang="ts">
	import Arrow from '$lib/icons/Arrow.svelte'
	import deepEqual from 'lodash.isequal'
	import Dropdown from './Dropdown.svelte'

	export let label: string
	export let name: string
	export let options: { display: string; value: string }[]
	export let selected = options[0]
	export let width = '400px'
	export let disabled = false
	export let hint = ''
</script>

<div style="width: {width};" class="flex flex-col mb-7 text-current">
	<div class="flex items-center mb-2 font-medium">
		<label class="text-sm w-3/5 text-{disabled ? 'neutral-300' : 'current'}" for={name}
			>{label}</label
		>
		<span class="flex justify-end text-neutral-400 text-xs w-2/5">{hint}</span>
	</div>
	<Dropdown options={options.filter((x) => !deepEqual(x, selected))} bind:selected>
		<div
			tabindex="0"
			class="relative flex items-center font-medium text-sm px-4 py-[14px] bg-white border border-neutral-200 rounded focus:border-purple-500Light"
		>
			{selected.display}
			<div class="absolute right-2 w-6 h-6">
				<Arrow direction="down" />
			</div>
		</div>
	</Dropdown>
</div>
