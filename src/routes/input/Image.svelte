<script lang="ts">
  import type { ParsedInput } from '$lib/@types/common.js'
  import photo from '$lib/icons/photo.js'
  import { parseInput } from '$lib/input-parser.js'
  import { file } from '$lib/services.js'
  import { createEventDispatcher } from 'svelte'
  import ParsedInputButton from './ParsedInputButton.svelte'
  import Spinner from '$lib/components/Spinner.svelte'
  import { appWorker, appWorkerMessages$ } from '$lib/worker.js'
  import { filter, takeUntil } from 'rxjs'
  import { onDestroy$ } from '$lib/streams.js'
  import { translate } from '$lib/i18n/translations.js'

  const dispatch = createEventDispatcher()

  let fileInput: HTMLInputElement
  let imageSrc: string
  let imageEl: HTMLImageElement
  let parsed: ParsedInput | null = null
  let loading = false

  const workerMessageId = 'qr-processed'

  appWorkerMessages$
    .pipe(
      filter(({ data }) => data.id === workerMessageId),
      takeUntil(onDestroy$)
    )
    .subscribe(({ data }) => handleResult(data.result as string))

  const handleResult = (result: string) => {
    if (result) {
      parsed = parseInput(result)
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
    fileInput.click()

    loading = false
  }

  const readImage = async () => {
    const image = Object.assign(new Image(), { src: imageSrc })
    await new Promise(resolve => image.addEventListener('load', resolve))

    const context = Object.assign(document.createElement('canvas'), {
      width: image.width,
      height: image.height
    }).getContext('2d')

    context!.imageSmoothingEnabled = false
    context!.drawImage(image, 0, 0)

    const { data, height, width } = context!.getImageData(0, 0, image.width, image.height)

    appWorker.postMessage({
      id: workerMessageId,
      type: 'qr-process',
      qr: { data, height, width }
    })
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
      {#if !parsed}
        <button on:click={open} class="flex flex-col justify-center items-center absolute">
          <div class="w-10 shadow shadow-current rounded-full p-1">
            {@html photo}
          </div>

          <div class="mt-2 font-semibold text-sm">{$translate('app.labels.import_image')}</div>
        </button>
      {/if}
    {:else}
      <Spinner />
    {/if}

    {#if parsed}
      <div class="absolute bottom-2.5 right-2">
        <ParsedInputButton {parsed} on:click={() => dispatch('input', parsed)} />
      </div>
    {/if}
  </div>
</div>
