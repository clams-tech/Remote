<script lang="ts">
	import { onDestroy, onMount } from 'svelte'
	import QrScanner from 'qr-scanner'
	// https://github.com/nimiq/qr-scanner
	import debounce from 'lodash.debounce'
	import { t } from '$lib/i18n/translations'
	import BackButton from '$lib/elements/BackButton.svelte'
	import { goto } from '$app/navigation'

	export let onResult
	export let onError = () => {}

	const debouncedOnResult = debounce(onResult, 200)

	let videoEl: HTMLVideoElement
	let qrScanner: QrScanner
	let displayError = false

	onMount(async () => {
		try {
			qrScanner = new QrScanner(videoEl, ({ data }) => debouncedOnResult(data), {
				onDecodeError: onError,
				preferredCamera: 'environment',
				highlightScanRegion: true,
				highlightCodeOutline: true
			})

			await qrScanner.start()
		} catch (error) {
			displayError = true
		}
	})

	onDestroy(() => {
		qrScanner.stop()
	})
</script>

<div class="container relative items-center flex justify-center w-full bg-[#000000]">
	<div class="text-white">
		<BackButton on:click={() => goto('/')} />
	</div>

	<!-- svelte-ignore a11y-media-has-caption -->
	<video bind:this={videoEl} />

	{#if displayError}
		<div>
			{$t('app.errors.camera_connection')}
		</div>
	{/if}
</div>

<style>
	.container {
		min-height: 100vh;
		/* mobile viewport bug fix */
		min-height: -webkit-fill-available;
	}
</style>
