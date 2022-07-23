<script lang="ts">
	import Button from '$lib/elements/Button.svelte'
	import TextInput from '$lib/elements/TextInput.svelte'
	import { t } from '$lib/i18n/translations'
	import Arrow from '$lib/icons/Arrow.svelte'
	import { onMount } from 'svelte'

	export let description = ''
	export let error: string = ''
	export let next: () => void
	export let readonly = false

	let focusInput: () => void

	onMount(() => {
		setTimeout(focusInput, 500)
	})
</script>

<section class="flex flex-col justify-center w-full p-8 max-w-xl">
	<div class="mb-6">
		<h1 class="text-4xl font-bold mb-4">{$t('app.payment.description.heading')}</h1>
		<p class="text-neutral-600 italic">{$t('app.payment.description.subheading')}</p>
	</div>

	<TextInput
		type="textarea"
		bind:value={description}
		{readonly}
		name="description"
		invalid={error}
		maxlength={100}
		rows={2}
		bind:focus={focusInput}
	/>

	<Button text={$t('app.buttons.view_summary')} on:click={next}>
		<div slot="iconRight" class="w-6">
			<Arrow direction="right" />
		</div>
	</Button>
</section>
