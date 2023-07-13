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
  let actionMessage = ''

  $: if (node) {
    qrCode = new QRCodeStyling({
      width: size,
      height: size,
      type: 'svg',
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
      image: '/icons/512x512.png'
    })

    qrCode.append(node)
  }

  $: if (qrCode) {
    qrCode.update({ data: selectedValue.value })
  }

  type ActionType = 'copyImage' | 'copyText' | 'downloadImage'

  type Action = {
    result: 'success' | 'failed' | null
    message: string
    timeout: NodeJS.Timeout | null
  }

  const actions: Record<ActionType, Action> = {
    copyImage: {
      result: null,
      message: '',
      timeout: null
    },
    copyText: {
      result: null,
      message: '',
      timeout: null
    },
    downloadImage: {
      result: null,
      message: '',
      timeout: null
    }
  }

  function clearMessage(type: ActionType) {
    actions[type].timeout = setTimeout(() => {
      actions[type].message = ''
      actions[type].result = null
    }, 2000)
  }

  async function copyImage() {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': rawData
        })
      ])

      actions.copyImage.message = $translate('app.labels.image_copied')
      actions.copyImage.result = 'success'
    } catch (error) {
      const { message } = error as Error
      actions.copyImage.message = message
      actions.copyImage.result = 'failed'
    } finally {
      clearMessage('copyImage')
    }
  }

  async function downloadImage() {
    try {
      qrCode.download({
        extension: 'png',
        name: `${selectedValue.label}-${truncateValue(selectedValue.value, 6)}`
      })

      actions.downloadImage.message = $translate('app.labels.image_downloaded')
      actions.downloadImage.result = 'success'
    } catch (error) {
      const { message } = error as Error
      actions.downloadImage.message = message
      actions.downloadImage.result = 'failed'
    } finally {
      clearMessage('downloadImage')
    }
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(selectedValue.value)
      actions.copyText.message = $translate('app.labels.text_copied')
      actions.copyText.result = 'success'
    } catch (error) {
      const { message } = error as Error
      actions.copyText.message = message
      actions.copyText.result = 'failed'
    } finally {
      clearMessage('copyText')
    }
  }

  onDestroy(() => {
    Object.values(actions).forEach(({ timeout }) => timeout && clearTimeout(timeout))
  })
</script>

<div>
  <div class="flex items-center justify-between">
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
    style="min-width: {size}px;"
    class="border-2 border-neutral-400 rounded-b-lg rounded-tr-lg shadow-md max-w-full p-2 md:p-4 flex flex-col justify-center items-center box-content"
  >
    <button
      on:click={copyText}
      class="rounded overflow-hidden w-full flex items-center justify-center"
      bind:this={node}
    />
  </div>

  <div class="w-full flex justify-between">
    <div>
      {#if actionMessage}
        <div class="text-sm" in:slide={{ axis: 'x' }}>{actionMessage}</div>
      {/if}
    </div>

    <div class="flex items-center gap-x-1">
      <button on:click={copyImage} class="flex items-center">
        {#if actions.copyImage.result}
          <div
            in:fade|local={{ duration: 250 }}
            class="w-8"
            class:text-utility-success={actions.copyImage.result === 'success'}
            class:text-utility-error={actions.copyImage.result === 'failed'}
          >
            {@html actions.copyImage.result === 'success' ? check : close}
          </div>
        {:else}
          <div in:fade|local={{ duration: 250 }} class="w-8">{@html copy}</div>
        {/if}
      </button>

      <button on:click={downloadImage} class="flex items-center">
        {#if actions.downloadImage.result}
          <div
            in:fade|local={{ duration: 250 }}
            class="w-8"
            class:text-utility-success={actions.downloadImage.result === 'success'}
            class:text-utility-error={actions.downloadImage.result === 'failed'}
          >
            {@html actions.downloadImage.result === 'success' ? check : close}
          </div>
        {:else}
          <div in:fade|local={{ duration: 250 }} class="w-8">{@html photo}</div>
        {/if}
      </button>
    </div>
  </div>
</div>
