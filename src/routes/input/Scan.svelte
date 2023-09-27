<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte'
  import Spinner from '$lib/components/Spinner.svelte'
  import { parseInput } from '$lib/input-parser.js'
  import { isDesktop, nowSeconds } from '$lib/utils.js'
  import type { ParsedInput } from '$lib/@types/common.js'
  import ParsedInputButton from './ParsedInputButton.svelte'
  import scan from '$lib/icons/scan.js'
  import { slide } from 'svelte/transition'
  import ErrorDetail from '$lib/components/ErrorDetail.svelte'
  import type { AppError } from '$lib/@types/errors.js'
  import { appWorker, appWorkerMessages$ } from '$lib/worker.js'
  import { filter, map, takeUntil } from 'rxjs'
  import { onDestroy$ } from '$lib/streams.js'

  const dispatch = createEventDispatcher()

  let parsed: ParsedInput | null = null
  let timeout: NodeJS.Timeout

  let err: AppError | null = null

  const workerMessageId = 'qr-processed'

  appWorkerMessages$
    .pipe(
      filter(({ data }) => data.id === workerMessageId),
      takeUntil(onDestroy$)
    )
    .subscribe(({ data }) => handleScanResult(data.result as string))

  const handleScanResult = (val: string) => {
    if (val) {
      parsed = parseInput(val)
    }

    tickTimeout = setTimeout(tick, val ? 1000 : 0)
    timeout && clearTimeout(timeout)
    timeout = setTimeout(() => (parsed = null), 4000)
  }

  onDestroy(() => {
    timeout && clearTimeout(timeout)
  })

  let video: HTMLVideoElement
  let canvas: HTMLCanvasElement
  let scanRegion: { x: number; y: number; width: number; height: number }
  let copyRegion: { x: number; y: number; width: number; height: number }
  let tickTimeout: NodeJS.Timeout
  let stream: MediaStream

  async function checkCameraSupport(): Promise<void> {
    const supportError: AppError = {
      key: 'camera_browser_support',
      detail: {
        timestamp: nowSeconds(),
        context: 'Checking camera support',
        message: 'Camera access is not supported'
      }
    }

    if (!navigator.mediaDevices) {
      throw supportError
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter(d => d.kind === 'videoinput')

      if (!cameras[0]) {
        supportError.detail.message = 'No camera available on device.'
        throw supportError
      }
    } catch (error) {
      const { message } = error as Error
      supportError.detail.message = message
      throw supportError
    }
  }

  let canvasContext: CanvasRenderingContext2D
  let loading = false

  const startCamera = async () => {
    loading = true
    try {
      await checkCameraSupport()

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 99999 },
            height: { ideal: 99999 }
          },
          audio: false
        })

        video.disablePictureInPicture = true
        video.playsInline = true
        video.muted = true
        video.srcObject = stream

        await video.play()

        setTimeout(startScanRegion, 100)
      } catch (error) {
        const { message } = error as Error

        throw {
          key: 'camera_permissions',
          detail: {
            timestamp: nowSeconds(),
            context: 'starting camera',
            message
          }
        }
      }
    } catch (error) {
      err = error as AppError
    }
  }

  async function startScanRegion() {
    scanRegion = calculateScanRegion(video)
    copyRegion = calculateCopyRegion(video)

    canvas.height = scanRegion.height
    canvas.width = scanRegion.width
    canvasContext = canvas.getContext('2d', { alpha: false, willReadFrequently: true })!
    canvasContext.imageSmoothingEnabled = false // gives less blurry images

    tick()

    loading = false
  }

  function calculateScanRegion(video: HTMLVideoElement) {
    const smallestDimension = Math.min(video.clientWidth, video.clientHeight)
    const scanRegionSize = Math.round((2 / 3) * smallestDimension)

    return {
      x: Math.round((video.clientWidth - scanRegionSize) / 2),
      y: Math.round((video.clientHeight - scanRegionSize) / 2),
      width: scanRegionSize,
      height: scanRegionSize
    }
  }

  function calculateCopyRegion(video: HTMLVideoElement) {
    const smallestDimension = Math.min(video.videoWidth, video.videoHeight)
    const scanRegionSize = Math.round((2 / 3) * smallestDimension)
    return {
      x: Math.round((video.videoWidth - scanRegionSize) / 2),
      y: Math.round((video.videoHeight - scanRegionSize) / 2),
      width: scanRegionSize,
      height: scanRegionSize
    }
  }

  const updateJsQr = () => {
    if (canvas) {
      canvasContext.drawImage(
        video,
        copyRegion.x,
        copyRegion.y,
        copyRegion.width,
        copyRegion.height,
        0,
        0,
        canvas.width,
        canvas.height
      )

      const { data, height, width } = canvasContext.getImageData(0, 0, canvas.width, canvas.height)

      appWorker.postMessage({
        id: workerMessageId,
        type: 'qr-process',
        qr: { data, height, width }
      })
    }
  }

  function tick() {
    requestAnimationFrame(updateJsQr)
  }

  onDestroy(() => {
    tickTimeout && clearTimeout(tickTimeout)
    stream && stream.getVideoTracks().forEach(track => track.stop())
  })

  const desktopDevice = isDesktop()
</script>

<div class="relative items-center flex-col flex justify-center w-full min-h-[304px]">
  <div class="flex items-center justify-center w-full h-full">
    <div class="transition-all overflow-hidden w-full h-full">
      <!-- svelte-ignore a11y-media-has-caption -->
      <video bind:this={video} class:-scale-x-100={desktopDevice} />
    </div>

    <!-- Hidden canvas to take snapshots of webcam stream to send to qr decoder -->
    <canvas
      bind:this={canvas}
      class="absolute top-[-1000px] left-[-1000px]"
      class:-scale-x-100={desktopDevice}
    />

    {#if scanRegion}
      <div
        style={`width: ${scanRegion.width}px; height: ${scanRegion.height}px;`}
        class="absolute box z-50"
      />
    {/if}

    {#if !scanRegion && !loading}
      <button on:click={startCamera} class="w-10 shadow shadow-current rounded-full p-1 absolute"
        >{@html scan}</button
      >
    {/if}
  </div>

  {#if err}
    <div transition:slide={{ axis: 'y' }} class="absolute bottom-2">
      <ErrorDetail error={err} />
    </div>
  {/if}

  {#if parsed}
    <ParsedInputButton {parsed} on:click={() => dispatch('input', parsed)} />
  {/if}

  {#if loading && !err}
    <div class="absolute">
      <Spinner />
    </div>
  {/if}
</div>

<style>
  .box {
    --b: 5px; /* thickness of the border */
    --c: white; /* color of the border */
    --w: 20px; /* width of border */
    --r: 10px; /* width of border */

    padding: var(--b); /* space for the border */
  }
  .box::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--c);
    padding: var(--b);
    border-radius: var(--r);
    -webkit-mask: linear-gradient(0deg, #000 calc(2 * var(--b)), #0000 0) 50% var(--b) /
        calc(100% - 2 * var(--w)) 100% repeat-y,
      linear-gradient(-90deg, #000 calc(2 * var(--b)), #0000 0) var(--b) 50%/100%
        calc(100% - 2 * var(--w)) repeat-x,
      linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask: linear-gradient(0deg, #000 calc(2 * var(--b)), #0000 0) 50% var(--b) /
        calc(100% - 2 * var(--w)) 100% repeat-y,
      linear-gradient(-90deg, #000 calc(2 * var(--b)), #0000 0) var(--b) 50%/100%
        calc(100% - 2 * var(--w)) repeat-x,
      linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    /* -webkit-mask-composite: destination-out; */
    mask-composite: exclude;
  }
</style>
