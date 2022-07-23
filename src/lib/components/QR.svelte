<script lang="ts">
	import { onDestroy } from 'svelte'
	import { fade } from 'svelte/transition'
	import QRCodeStyling from 'qr-code-styling'

	export let value: string
	export let size = Math.min(window.innerWidth - 64, 400)
	// export let logo;
	let canvas: HTMLCanvasElement = null

	export function getQrImage() {
		return canvas?.toDataURL()
	}

	let node
	let qrcode

	$: if (value && node) {
		qrcode && qrcode.clear()

		const qrCode = new QRCodeStyling({
			width: size,
			height: size,
			type: 'svg',
			data: `lightning:${value}`.toUpperCase(),
			// margin: 4,
			imageOptions: { hideBackgroundDots: true, imageSize: 0.4, margin: 0 },
			dotsOptions: {
				type: 'dots',
				color: '#6a1a4c',
				gradient: {
					type: 'radial',
					rotation: 0.017453292519943295,
					colorStops: [
						{ offset: 0, color: '#8236f3' },
						{ offset: 1, color: '#3b0390' }
					]
				}
			},
			backgroundOptions: { color: '#ffffff' },
			image: '/clams-icon.png',
			cornersSquareOptions: { type: 'extra-rounded', color: '#6305f0' },
			cornersDotOptions: { type: 'dot', color: '#000000' }
		})

		qrCode.append(node)
	}

	console.log(value)

	onDestroy(() => {
		qrcode && qrcode.clear()
	})
</script>

<div in:fade class="border-2 border-neutral-400 rounded-lg shadow-md">
	<div class="m-4 rounded overflow-hidden" bind:this={node} />
</div>
