<script lang="ts" context="module">
	export { load } from '$lib/utils'
</script>

<script lang="ts">
	import { lastPath$ } from '$lib/streams'
	import { goto } from '$app/navigation'
	import { fade } from 'svelte/transition'
	import Slide from '$lib/elements/Slide.svelte'
	import { t } from '$lib/i18n/translations'
</script>

<svelte:head>
	<title>{$t('app.titles.payments')}</title>
</svelte:head>

<Slide
	back={() => {
		goto('/')
	}}
	direction={$lastPath$ && $lastPath$.includes('payments') ? 'right' : 'left'}
>
	<section in:fade class="flex flex-col items-center w-full p-8 max-w-xl">
		<h2 class="text-2xl font-bold mb-5">Payments</h2>
	</section>
</Slide>
