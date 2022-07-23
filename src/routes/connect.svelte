<script>
	import { t } from '$lib/i18n/translations'
	import { fade } from 'svelte/transition'

	// on load:
	// check for credentials in storage

	// if credentials then ask for pin entry to decrypt credentials
	// once decrypted initialise connection to node and fetch data

	// if no credentials then render connect/login screen

	import { initLnSocket } from '$lib/backends/core'

	// initLnSocket()
</script>

<svelte:head>
	<title>{$t('app.titles.connect')}</title>
</svelte:head>

<div in:fade class="p-4 w-full h-full flex flex-col justify-center items-center">
	<div class="w-full flex flex-col items-start">
		<h1 class="text-5xl mt-2 mb-8 pb-2 border-b-4 rounded border-b-purple-500">
			{$t('app.titles.connect')}
		</h1>
		<div class="w-full max-w-md flex flex-col items-center justify-center" />
	</div>
</div>
