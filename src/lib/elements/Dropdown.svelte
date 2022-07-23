<script lang="ts">
	import { fade } from 'svelte/transition'
	import ConditionalLinkWrapper from './ConditionalLinkWrapper.svelte'
  import {clickOutside} from '$lib/utils'

	export let options: DropdownOption[]
	export let selected = options[0]
  export let width = "100%"
  export let justify: "start" | 'end' = 'end'

	let dropdown = false;
	let mainElementHeight: number;

  type DropdownOption = {
		display: string;
		value?: string;
		onclick?: (event: Event) => void;
		href?: string;
		target?: string;
		rel?: string;
	};
</script>

<div use:clickOutside={() => dropdown = false} bind:clientHeight={mainElementHeight} class="relative">
	<div class="cursor-pointer" on:click={() => options.length && (dropdown = !dropdown)}>
		<slot />
	</div>

	{#if dropdown}
		<div
			style="top: {mainElementHeight}; width: {width}; {justify === 'end' ? 'right: 0;' : 'left: 0;'}"
			class="flex flex-col bg-white absolute z-10 py-3 rounded-b-lg shadow-md"
			in:fade={{duration: 150}}
		>
			{#each options as { href, target, rel, display, value, onclick = (event) => {} } (`${href}:${display}`)}
				<div class="px-2 py-1 cursor-pointer">
					<ConditionalLinkWrapper {href} {target} {rel}>
						<div
							on:click|stopPropagation={(e) => {
                selected = {display, value}
                dropdown = false
                onclick(e)
              }}
							class="w-full flex px-6 py-2 text-sm font-medium text-neutral-800 hover:bg-purple-500Light transition-all rounded hover:no-underline"
						>
							{display}
						</div>
					</ConditionalLinkWrapper>
				</div>
			{/each}
		</div>
	{/if}
</div>
