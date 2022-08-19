<script lang="ts">
	import Button from '$lib/elements/Button.svelte'
	import { t } from '$lib/i18n/translations'
	import Arrow from '$lib/icons/Arrow.svelte'
	import Value from './Value.svelte'

	export let value: string
	export let direction: 'send' | 'receive'
	export let next: () => void
	export let readonly = false
	export let required = false
</script>

<section class="flex flex-col justify-center items-start w-full p-8 max-w-xl">
	<div class="mb-6">
		<h1 class="text-4xl font-bold mb-4">{$t('app.headings.amount')}</h1>
		<p class="text-neutral-600 italic">{$t('app.subheadings.amount', { direction })}</p>
	</div>

	<div class="my-4 w-full">
		<Value bind:value {readonly} />
	</div>

	<div class="mt-6 w-full">
		<Button
			disabled={required && (!value || value === '0')}
			text={$t('app.buttons.next')}
			on:click={next}
		>
			<div slot="iconRight" class="w-6">
				<Arrow direction="right" />
			</div>
		</Button>
	</div>
</section>
