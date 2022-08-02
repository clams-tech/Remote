<script lang="ts" context="module">
	export { load } from '$lib/utils'
</script>

<script lang="ts">
	import { fade } from 'svelte/transition'
	import { t } from '$lib/i18n/translations'
	import QRIcon from '$lib/icons/Qr.svelte'
	import ArrowIcon from '$lib/icons/Arrow.svelte'
	import ClamsLogo from '$lib/icons/ClamsLogo.svelte'
	import Link from '$lib/elements/Link.svelte'
	import { decodeRune } from '$lib/utils'

	const buttons = [
		{ key: 'send', icon: ArrowIcon, props: { direction: 'up' } },
		{ key: 'scan', icon: QRIcon, props: {} },
		{ key: 'receive', icon: ArrowIcon, props: {} }
	]

	// const rune =
	// 'WCt1TSpKlXG4r7D7R2dxywFlDrUsNiCA5VK4GaWEZdQ9MyZpZD0wMjRiOWExZmE4ZTAwNmYxZTM5MzdmNjVmNjZjNDA4ZTZkYThlMWNhNzI4ZWE0MzIyMmE3MzgxZGYxY2M0NDk2MDUmbWV0aG9kPWxpc3RwZWVycyZwbnVtPTEmcG5hbWVpZD0wMjRiOWExZmE4ZTAwNmYxZTM5MzdmNjVmNjZjNDA4ZTZkYThlMWNhNzI4ZWE0MzIyMmE3MzgxZGYxY2M0NDk2MDV8cGFycjA9MDI0YjlhMWZhOGUwMDZmMWUzOTM3ZjY1ZjY2YzQwOGU2ZGE4ZTFjYTcyOGVhNDMyMjJhNzM4MWRmMWNjNDQ5NjA1'

	const rune =
		'MsNO5ExQ_KLfbVnCGJFr8ctwq58EMx9Sgxpo1ekRLyo9MyZpZD0wMjRiOWExZmE4ZTAwNmYxZTM5MzdmNjVmNjZjNDA4ZTZkYThlMWNhNzI4ZWE0MzIyMmE3MzgxZGYxY2M0NDk2MDUmbWV0aG9kPWxpc3RwZWVycyZwbnVtPTEmcG5hbWVpZD0wMjRiOWExZmE4ZTAwNmYxZTM5MzdmNjVmNjZjNDA4ZTZkYThlMWNhNzI4ZWE0MzIyMmE3MzgxZGYxY2M0NDk2MDV8cGFycjA9MDI0YjlhMWZhOGUwMDZmMWUzOTM3ZjY1ZjY2YzQwOGU2ZGE4ZTFjYTcyOGVhNDMyMjJhNzM4MWRmMWNjNDQ5NjA1JnRpbWU8MTY1OTU2NzMyMiZyYXRlPTI='
	decodeRune(rune)
</script>

<svelte:head>
	<title>{$t('app.titles.home')}</title>
</svelte:head>

<div in:fade class="h-full w-full flex flex-col items-center justify-center">
	<div class="w-1/3 max-w-xs">
		<ClamsLogo />
	</div>

	<div class="flex items-center justify-around w-full max-w-lg p-4 mt-4">
		{#each buttons as { key, icon, props } (key)}
			<a
				href={`/${key}`}
				class=" w-1/4 h-24 border rounded flex flex-col justify-center items-center"
			>
				<div class="w-12">
					<svelte:component this={icon} {...props} />
				</div>
				<div>{$t(`app.buttons.${key}`)}</div>
			</a>
		{/each}
	</div>

	<Link href="/payments">payments</Link>
	<Link href="/settings">settings</Link>
</div>
