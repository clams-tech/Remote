<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import debounce from 'lodash.debounce'
  import { translate } from '$lib/i18n/translations'
  import Spinner from '$lib/components/Spinner.svelte'
  import { parseInput } from '$lib/input-parser.js'
  import { isDesktop, truncateValue } from '$lib/utils.js'
  import Msg from '$lib/components/Msg.svelte'
  import type { ParsedInput } from '$lib/@types/common.js'
  import caret from '$lib/icons/caret.js'
  import { slide } from 'svelte/transition'

  const dispatch = createEventDispatcher()

  let parsed: ParsedInput | null = null
  let timeout: NodeJS.Timeout

  let cameraError = ''

  const handleScanResult = debounce((val: string) => {
    parsed = parseInput(val)

    timeout && clearTimeout(timeout)
    timeout = setTimeout(() => (parsed = null), 4000)
  }, 200)

  onDestroy(() => {
    timeout && clearTimeout(timeout)
  })

  let video: HTMLVideoElement
  let canvas: HTMLCanvasElement
  let scanRegion: { x: number; y: number; width: number; height: number }
  let copyRegion: { x: number; y: number; width: number; height: number }
  let tickTimeout: NodeJS.Timeout
  let stream: MediaStream

  async function checkCameraSupport(): Promise<boolean> {
    if (!navigator.mediaDevices) {
      return false
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter((d) => d.kind === 'videoinput')
      return !!cameras[0]
    } catch (error) {
      return false
    }
  }

  let qrWorker: Worker
  let canvasContext: CanvasRenderingContext2D
  let loaded = false
  let videoLoaded = false

  onMount(async () => {
    const supported = await checkCameraSupport()

    if (!supported) {
      cameraError = $translate('app.errors.camera_browser_support')
      return
    }

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

      videoLoaded = true

      setTimeout(startScanRegion, 100)
    } catch (error) {
      cameraError = $translate('app.errors.camera_permissions')

      return
    }

    loaded = true
  })

  async function startScanRegion() {
    scanRegion = calculateScanRegion(video)
    copyRegion = calculateCopyRegion(video)

    canvas.height = scanRegion.height
    canvas.width = scanRegion.width
    canvasContext = canvas.getContext('2d', { alpha: false, willReadFrequently: true })!
    canvasContext.imageSmoothingEnabled = false // gives less blurry images

    const { default: QrWorker } = await import('$lib/qr.worker?worker')
    qrWorker = new QrWorker()
    qrWorker.addEventListener('message', handleMessage)

    tick()

    loaded = true
  }

  function handleMessage(message: MessageEvent) {
    const { data } = message
    if (data && data.data) {
      handleScanResult(data.data)
    }

    tickTimeout = setTimeout(tick, data ? 1000 : 0)
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
      qrWorker.postMessage({ data, height, width })
    }
  }

  function tick() {
    requestAnimationFrame(updateJsQr)
  }

  onDestroy(() => {
    if (qrWorker) {
      qrWorker.removeEventListener('message', handleMessage)
      qrWorker.terminate()
    }

    tickTimeout && clearTimeout(tickTimeout)
    stream && stream.getVideoTracks().forEach((track) => track.stop())
  })

  const desktopDevice = isDesktop()
</script>

<div class="relative items-center flex-col flex justify-center w-full">
  <div class="flex items-center justify-center w-full h-full bg-neutral-900">
    <div
      class:w-0={!videoLoaded}
      class:w-full={videoLoaded}
      class:h-40={!videoLoaded}
      class:h-full={videoLoaded}
      class="transition-all overflow-hidden"
    >
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
  </div>

  {#if cameraError}
    <div class="max-w-sm mb-2">
      <Msg type="error" bind:message={cameraError} closable={false} />
    </div>
  {/if}

  {#if parsed}
    <button
      disabled={parsed.type === 'unknown'}
      on:click={() => dispatch('input', parsed)}
      transition:slide={{ axis: 'x' }}
      class="absolute bottom-2.5 right-2 py-1 px-4 shadow shadow-current rounded-full flex items-center bg-neutral-900 whitespace-nowrap"
    >
      <div class="font-semibold mr-1">
        {$translate(`app.labels.${parsed.type}`)}:
      </div>
      <div>
        {truncateValue(parsed.value)}
      </div>
      <div class="w-4 -rotate-90 ml-1 -mr-2">{@html caret}</div>
    </button>
  {/if}

  {#if !videoLoaded && !cameraError}
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
