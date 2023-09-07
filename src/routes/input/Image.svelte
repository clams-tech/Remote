<script lang="ts">
  import type { ParsedInput } from '$lib/@types/common.js'
  import photo from '$lib/icons/photo.js'
  import { parseInput } from '$lib/input-parser.js'
  import { file } from '$lib/services.js'
  import { createEventDispatcher, onMount } from 'svelte'
  import ParsedInputButton from './ParsedInputButton.svelte'
  import Spinner from '$lib/components/Spinner.svelte'

  const dispatch = createEventDispatcher()

  let fileInput: HTMLInputElement
  let imageSrc: string
  let imageEl: HTMLImageElement
  let qrWorker: Worker
  let parsed: ParsedInput | null = null
  let loading = false

  onMount(async () => {
    const { default: QrWorker } = await import('$lib/qr.worker?worker')
    qrWorker = new QrWorker()
    qrWorker.addEventListener('message', handleMessage)
  })

  const handleMessage = (message: MessageEvent) => {
    const { data } = message
    if (data && data.data) {
      parsed = parseInput(data.data)
    }
  }

  const handleFile = (image: Blob) => {
    parsed = null
    imageSrc = URL.createObjectURL(image)
  }

  const getFile = async () => {
    const { files } = fileInput

    if (files) {
      const [file] = Array.from(files)
      file && handleFile(file)
    }
  }

  const open = async () => {
    loading = true
    if (window.__TAURI__) {
      const image = await file.open([
        {
          name: 'Image',
          extensions: ['png', 'jpeg']
        }
      ])

      image && handleFile(new Blob([image], { type: 'image/jpeg' }))
    } else {
      fileInput.click()
    }

    loading = false
  }

  const readImage = async () => {
    const image = Object.assign(new Image(), { src: imageSrc })
    await new Promise((resolve) => image.addEventListener('load', resolve))

    const context = Object.assign(document.createElement('canvas'), {
      width: image.width,
      height: image.height
    }).getContext('2d')

    context!.imageSmoothingEnabled = false
    context!.drawImage(image, 0, 0)

    const { data, height, width } = context!.getImageData(0, 0, image.width, image.height)
    qrWorker.postMessage({ data, height, width })
  }
</script>

<div class="flex flex-col justify-center items-center w-full min-h-[304px] py-4 px-2 relative">
  {#if imageSrc}
    <div class="mb-4 max-w-md">
      <img bind:this={imageEl} on:load={readImage} width="100%" src={imageSrc} alt="Selected" />
    </div>
  {/if}

  <div
    class="w-full flex items-center h-full"
    class:justify-center={!imageSrc}
    class:justify-between={imageSrc}
  >
    <input
      type="file"
      bind:this={fileInput}
      on:change={getFile}
      accept="image/png, image/jpeg"
      class="hidden"
    />

    {#if !loading}
      <button class="w-10 shadow shadow-current rounded-full p-1" on:click={open}>
        {@html photo}
      </button>
    {:else}
      <Spinner />
    {/if}

    {#if parsed}
      <ParsedInputButton {parsed} on:click={() => dispatch('input', parsed)} />
    {/if}
  </div>
</div>
