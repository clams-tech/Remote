<script lang="ts">
  import { fade } from 'svelte/transition'
  import QRCodeStyling from 'qr-code-styling'
  import copy from '$lib/icons/copy'
  import photo from '$lib/icons/photo'
  import check from '$lib/icons/check'
  import { onDestroy } from 'svelte'
  import { logger, truncateValue } from '$lib/utils'

  export let value: string | null
  export let size = Math.min(window.innerWidth - 50, 400)

  export function getQrImage() {
    return canvas?.toDataURL()
  }

  const truncated = truncateValue(value as string)

  let canvas: HTMLCanvasElement | null = null
  let node: HTMLDivElement
  let qrCode: QRCodeStyling

  $: if (value && node) {
    qrCode = new QRCodeStyling({
      width: size,
      height: size,
      type: 'svg',
      data: `lightning:${value}`.toUpperCase(),
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
      cornersSquareOptions: { type: 'extra-rounded', color: '#6305f0' },
      cornersDotOptions: { type: 'dot', color: '#000000' }
    })

    qrCode.update({ image: '/icons/512x512.png' })
    qrCode.append(node)
  }

  let copySuccess = false
  let copyTimeout: NodeJS.Timeout

  async function copyImage() {
    try {
      qrCode.update({ type: 'canvas' })
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': qrCode.getRawData('png') as Promise<Blob>
        })
      ])

      copySuccess = true

      copyTimeout = setTimeout(() => (copySuccess = false), 3000)
    } catch (error) {
      logger.error(JSON.stringify(error))
    } finally {
      qrCode.update({ type: 'svg' })
    }
  }

  onDestroy(() => {
    copyTimeout && clearTimeout(copyTimeout)
  })
</script>

<div
  in:fade
  class="border-2 border-neutral-400 rounded-lg shadow-md max-w-full p-2 md:p-4 flex flex-col justify-center items-center relative"
>
  <div class="rounded overflow-hidden transition-opacity" bind:this={node} />
  <div class="absolute -bottom-9 right-0 mt-2 flex items-center gap-x-2">
    <button on:click={copyImage} class="flex items-center">
      {#if copySuccess}
        <div in:fade class="w-8 text-utility-success">{@html check}</div>
      {:else}
        <div in:fade class="w-8">{@html copy}</div>
      {/if}
    </button>
    <button
      on:click={() => qrCode.download({ extension: 'png', name: truncated })}
      class="flex items-center"
    >
      <div class="w-8">{@html photo}</div>
    </button>
  </div>
</div>
