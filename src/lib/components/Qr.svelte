<script lang="ts">
  import { slide } from 'svelte/transition'
  import copy from '$lib/icons/copy'
  import photo from '$lib/icons/photo'
  import { onDestroy } from 'svelte'
  import { truncateValue } from '$lib/utils'
  import { translate } from '$lib/i18n/translations.js'
  import info from '$lib/icons/info.js'
  import save from '$lib/icons/save.js'
  import { clipboard, file } from '$lib/services.js'
  import { QrCode, Ecc } from '$lib/qrcodegen.js'

  export let values: { label: string; value: string }[]

  let selectedValueIndex = 0
  $: selectedValue = values[selectedValueIndex]

  let canvas: HTMLCanvasElement

  type Message = {
    value: string
    timeout: NodeJS.Timeout | null
  }

  let message: Message | null = null

  let width = Math.min(window.innerWidth - 32, 400)

  $: if (selectedValue && canvas) {
    const qr: QrCode = QrCode.encodeText(selectedValue.value, Ecc.LOW)
    const scale = 4
    const border = 2
    const lightColor = '#FFFFFF'
    const darkColor = '#000000'

    const width = (qr.size + border * 2) * scale
    canvas.width = width
    canvas.height = width
    let ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    for (let y = -border; y < qr.size + border; y++) {
      for (let x = -border; x < qr.size + border; x++) {
        ctx.fillStyle = qr.getModule(x, y) ? darkColor : lightColor
        ctx.fillRect((x + border) * scale, (y + border) * scale, scale, scale)
      }
    }
  }

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
      await clipboard.writeImage(getBlob())
      setMessage($translate('app.labels.image_copied'))
    } catch (error) {
      const { message } = error as Error
      setMessage(message)
    }
  }

  function getBlob(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) {
          resolve(blob)
        }

        reject(new Error('Could get image data'))
      })
    })
  }

  async function saveImage() {
    try {
      const rawData = await getBlob()

      await file.save(
        rawData,
        `${selectedValue.label}-${truncateValue(selectedValue.value, 6)}.png`
      )

      setMessage($translate('app.labels.image_saved'))
    } catch (error) {
      const { message } = error as Error
      setMessage(message)
    }
  }

  async function copyText() {
    try {
      await clipboard.write(selectedValue.value)
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
  <div>
    <div class="flex items-center justify-start w-full">
      <div
        class="flex items-center text-xs font-semibold rounded-t-lg overflow-hidden border-t-2 border-x-2 border-white"
      >
        {#each values as { label }, index}
          <button
            on:click={() => (selectedValueIndex = index)}
            class="px-3 py-1 block"
            class:text-neutral-900={index === selectedValueIndex}
            class:bg-white={index === selectedValueIndex}
          >
            {label}
          </button>
        {/each}
      </div>
    </div>

    <div
      class="bg-black rounded-b-lg rounded-tr-lg w-full flex flex-col justify-center items-center overflow-hidden"
    >
      <button
        on:click={copyText}
        class="flex items-center justify-center"
        style="width: {width}px;"
      >
        <canvas bind:this={canvas} class="w-full" />
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
