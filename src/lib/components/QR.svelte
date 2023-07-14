<script lang="ts">
  import { fade, slide } from 'svelte/transition'
  import QRCodeStyling from 'qr-code-styling'
  import copy from '$lib/icons/copy'
  import photo from '$lib/icons/photo'
  import check from '$lib/icons/check'
  import { onDestroy } from 'svelte'
  import { truncateValue } from '$lib/utils'
  import { translate } from '$lib/i18n/translations.js'
  import close from '$lib/icons/close.js'
  import info from '$lib/icons/info.js'
  import save from '$lib/icons/save.js'

  export let values: { label: string; value: string }[]
  export let size = Math.min(window.innerWidth - 72, 400)

  export function getQrImage() {
    return canvas?.toDataURL()
  }

  let selectedValueIndex = 0

  $: selectedValue = values[selectedValueIndex]

  let canvas: HTMLCanvasElement | null = null
  let node: HTMLButtonElement
  let qrCode: QRCodeStyling
  let rawData: Blob

  $: if (node) {
    qrCode = new QRCodeStyling({
      width: size,
      height: size,
      type: 'svg',
      imageOptions: { hideBackgroundDots: true, imageSize: 0.25, margin: 0 },
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
      image: '/icons/512x512.png'
    })

    qrCode.append(node)
  }

  $: if (qrCode) {
    fetch('/icons/512x512.png').then(() => {
      qrCode.update({ image: '/icons/512x512.png' })
      qrCode.getRawData('png').then((data) => (rawData = data as Blob))
    })

    qrCode.update({ data: selectedValue.value })
  }

  type Message = {
    value: string
    timeout: NodeJS.Timeout | null
  }

  let message: Message | null = null

  function setMessage(value: string) {
    // clear current timeout
    message?.timeout && clearTimeout(message.timeout)

    message = {
      value,
      timeout: setTimeout(() => (message = null), 4000)
    }
  }

  async function copyImage() {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': rawData
        })
      ])

      setMessage($translate('app.labels.image_copied'))
    } catch (error) {
      const { message } = error as Error
      setMessage(message)
    }
  }

  async function downloadImage() {
    try {
      await qrCode.download({
        extension: 'png',
        name: `${selectedValue.label}-${truncateValue(selectedValue.value, 6)}`
      })

      setMessage($translate('app.labels.image_downloaded'))
    } catch (error) {
      const { message } = error as Error
      setMessage(message)
    }
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(selectedValue.value)
      setMessage($translate('app.labels.text_copied'))
    } catch (error) {
      const { message } = error as Error
      setMessage(message)
    }
  }

  onDestroy(() => {
    message?.timeout && clearTimeout(message.timeout)
  })
</script>

<div class="w-full flex flex-col items-center justify-center overflow-hidden">
  <div style="min-width: {size}px;">
    <div class="flex items-center justify-start w-full">
      <div
        class="flex items-center text-xs font-semibold rounded-t-lg border-t-2 border-x-2 border-neutral-400 overflow-hidden"
      >
        {#each values as { label }, index}
          <button
            on:click={() => (selectedValueIndex = index)}
            class="px-3 py-1 block"
            class:dark:text-neutral-900={index === selectedValueIndex}
            class:dark:bg-neutral-50={index === selectedValueIndex}
            class:text-neutral-50={index === selectedValueIndex}
            class:bg-neutral-900={index === selectedValueIndex}
          >
            {label}
          </button>
        {/each}
      </div>
    </div>

    <div
      class="border-2 border-neutral-400 rounded-b-lg rounded-tr-lg shadow-md max-w-full p-2 flex flex-col justify-center items-center overflow-hidden w-min"
    >
      <button on:click={copyText} class="rounded overflow-hidden" bind:this={node} />
    </div>

    <div class="w-full flex items-center justify-between px-2.5 overflow-hidden">
      <div class="text-sm overflow-hidden max-w-xs flex-grow">
        {#if message}
          <div transition:slide={{ axis: 'x' }} class="flex items-center">
            <div class="w-3.5 border border-current rounded-full mr-1 flex-shrink-0">
              {@html info}
            </div>
            <div class="truncate">
              {message.value}
            </div>
          </div>
        {/if}
      </div>

      <div class="flex items-center gap-x-1 -mr-1.5 justify-end">
        <button on:click={copyText} class="flex items-center">
          <div class="w-8">{@html copy}</div>
        </button>

        <button on:click={copyImage} class="flex items-center">
          <div class="w-8">{@html photo}</div>
        </button>

        <button on:click={downloadImage} class="flex items-center">
          <div class="w-8">{@html save}</div>
        </button>
      </div>
    </div>
  </div>
</div>
