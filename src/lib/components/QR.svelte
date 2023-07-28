<script lang="ts">
  import { toBlob } from 'html-to-image'
  import { fade, slide } from 'svelte/transition'
  import { QrCodeUtil } from '$lib/qr.js'
  import copy from '$lib/icons/copy'
  import photo from '$lib/icons/photo'
  import { onDestroy } from 'svelte'
  import { truncateValue } from '$lib/utils'
  import { translate } from '$lib/i18n/translations.js'
  import info from '$lib/icons/info.js'
  import save from '$lib/icons/save.js'
  import clamsIcon from '$lib/icons/clamsIcon.js'

  export let values: { label: string; value: string }[]
  export let size = Math.min(window.innerWidth - 72, 400)

  export function getQrImage() {
    return canvas?.toDataURL()
  }

  let selectedValueIndex = 0

  $: selectedValue = values[selectedValueIndex]

  let canvas: HTMLCanvasElement | null = null
  let qrElement: HTMLDivElement
  let rawData: Blob

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
    qrElement.classList.add('rounded-lg')

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': rawData || toBlob(qrElement)
        })
      ])

      qrElement.classList.remove('rounded-lg')
      setMessage($translate('app.labels.image_copied'))
    } catch (error) {
      const { message } = error as Error
      setMessage(message)
    }
  }

  async function saveImage() {
    try {
      qrElement.classList.add('rounded-lg')
      rawData = rawData || (await toBlob(qrElement))
      qrElement.classList.remove('rounded-lg')
      const fileUrl = URL.createObjectURL(rawData)
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = `${selectedValue.label}-${truncateValue(selectedValue.value, 6)}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setMessage($translate('app.labels.image_saved'))
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
      bind:this={qrElement}
      class="border-2 border-neutral-400 rounded-b-lg rounded-tr-lg shadow-md max-w-full p-2 flex flex-col justify-center items-center overflow-hidden w-min dark:bg-black bg-white"
    >
      <button
        on:click={copyText}
        class="rounded overflow-hidden flex items-center justify-center relative bg-white dark:bg-black"
      >
        <svg in:fade|global width={size} height={size}>
          <defs>
            <linearGradient id="purple" x1="25%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#C099FF" stop-opacity="1" />
              <stop offset="100%" stop-color="#904DFF" stop-opacity="1" />
            </linearGradient>
          </defs>
          {@html QrCodeUtil.generate(selectedValue.value, size, size / 4)}
        </svg>

        <div
          class="absolute dark:text-neutral-50"
          style="width: {size / 4}px; height: {size / 4}px;"
        >
          {@html clamsIcon}
        </div>
      </button>
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

        <button on:click={saveImage} class="flex items-center">
          <div class="w-8">{@html save}</div>
        </button>
      </div>
    </div>
  </div>
</div>
