<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import debounce from 'lodash.debounce'
  import { translate } from '$lib/i18n/translations'
  import BackButton from '$lib/elements/BackButton.svelte'
  import { goto } from '$app/navigation'
  import { createRandomHex, userAgent } from '$lib/utils'
  import { customNotifications$ } from '$lib/streams'

  export let onResult

  const debouncedOnResult = debounce(onResult, 200)
  const device = userAgent.getDevice()

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

  onMount(async () => {
    const supported = await checkCameraSupport()

    if (!supported) {
      customNotifications$.next({
        id: createRandomHex(),
        type: 'error',
        heading: $translate('app.errors.camera'),
        message: $translate('app.errors.camera_browser_support')
      })

      return
    }

    try {
      // const devices = await navigator.mediaDevices.enumerateDevices()
      // const videoDevices = devices.filter(({ kind }) => kind === 'videoinput')
      alert('getting access to camera stream')
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }
        },
        audio: false
      })

      alert('access to stream')

      video.disablePictureInPicture = true
      video.playsInline = true
      video.muted = true
      video.autoplay = true

      video.srcObject = stream
      await video.play()
      alert('video playing')

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
    } catch (error) {
      customNotifications$.next({
        id: createRandomHex(),
        type: 'error',
        heading: $translate('app.errors.camera'),
        message: $translate('app.errors.camera_permissions')
      })

      return
    }
  })

  function handleMessage({ data }: MessageEvent) {
    if (data && data.data) {
      debouncedOnResult(data.data)
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
    qrWorker.removeEventListener('message', handleMessage)
    qrWorker.terminate()
    tickTimeout && clearTimeout(tickTimeout)
    stream.getVideoTracks().forEach((track) => track.stop())
  })
</script>

<div
  class="container relative items-center flex-col flex justify-center w-full h-full pt-16 pb-4 px-4"
>
  <BackButton on:click={() => goto('/')} />

  <div class="flex items-center justify-center w-full h-full">
    <!-- svelte-ignore a11y-media-has-caption -->
    <video
      bind:this={video}
      class="rounded-xl overflow-hidden"
      class:-scale-x-100={device.type !== 'mobile' && device.type !== 'tablet'}
    />

    <!-- Hidden canvas to take snapshots of webcam stream to send to qr decoder -->
    <canvas
      bind:this={canvas}
      class="absolute top-[-1000px] left-[-1000px]"
      class:-scale-x-100={device.type !== 'mobile' && device.type !== 'tablet'}
    />

    {#if scanRegion}
      <div
        style={`width: ${scanRegion.width}px; height: ${scanRegion.height}px;`}
        class="absolute box z-50"
      />
    {/if}
  </div>
</div>

<style>
  .container {
    /* mobile viewport bug fix */
    min-height: -webkit-fill-available;
  }

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
