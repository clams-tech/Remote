<script lang="ts">
  import { fade } from 'svelte/transition'
  import QRCodeStyling from 'qr-code-styling'
  import copy from '$lib/icons/copy'
  import photo from '$lib/icons/photo'
  import check from '$lib/icons/check'
  import { onDestroy } from 'svelte'
  import { truncateValue } from '$lib/utils'
  import { logger } from '$lib/logs.js'

  export let value: string | null
  export let size = Math.min(window.innerWidth - 72, 400)

  export function getQrImage() {
    return canvas?.toDataURL()
  }

  const truncated = truncateValue(value as string)

  let canvas: HTMLCanvasElement | null = null
  let node: HTMLDivElement
  let qrCode: QRCodeStyling
  let rawData: Blob

  $: if (value && node) {
    qrCode = new QRCodeStyling({
      width: node.clientWidth,
      height: node.clientWidth,
      type: 'svg',
      data: value,
      imageOptions: { hideBackgroundDots: false, imageSize: 0.25, margin: 0 },
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
      cornersDotOptions: { type: 'dot', color: '#000000' },
      image: '/icons/clams-light.png'
    })

    qrCode.append(node)
  }

  let copySuccess = false
  let copyTimeout: NodeJS.Timeout

  async function copyImage() {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': rawData
        })
      ])

      copySuccess = true
      copyTimeout = setTimeout(() => (copySuccess = false), 3000)
    } catch (error) {
      const { message } = error as Error
      logger.error(message)
    }
  }

  onDestroy(() => {
    copyTimeout && clearTimeout(copyTimeout)
  })
</script>

<div
  style="min-width: {size}px;"
  class="border-2 border-neutral-400 rounded-lg shadow-md max-w-full p-2 md:p-4 flex flex-col justify-center items-center relative box-content"
>
  <div
    class="rounded overflow-hidden transition-opacity w-full flex items-center justify-center"
    bind:this={node}
  />
  <div class="absolute -bottom-9 right-0 mt-2 flex items-center gap-x-2">
    <button on:click={copyImage} class="flex items-center">
      {#if copySuccess}
        <div in:fade|local={{ duration: 250 }} class="w-8 text-utility-success">{@html check}</div>
      {:else}
        <div in:fade|local={{ duration: 250 }} class="w-8">{@html copy}</div>
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
