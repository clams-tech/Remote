<script lang="ts">
  import debounce from 'lodash.debounce'
  import { onDestroy, onMount } from 'svelte'

  let canvas: HTMLCanvasElement

  const lavaWorker = new Worker(new URL('../lava.worker.js', import.meta.url), {
    type: 'module'
  })

  const start = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const offscreenCanvas = canvas.transferControlToOffscreen()

    lavaWorker.postMessage(
      {
        canvas: offscreenCanvas,
        innerWidth: window.innerWidth,
        offsetWidth: canvas.offsetWidth,
        offsetHeight: canvas.offsetHeight,
        offsetLeft: canvas.offsetLeft,
        offsetTop: canvas.offsetTop
      },
      [offscreenCanvas]
    )
  }

  const resize = () => {
    lavaWorker.postMessage({ type: 'resize', width: innerWidth, height: innerHeight })
  }

  onMount(() => start())
  onDestroy(() => lavaWorker.terminate())

  const debouncedHandleResize = debounce(resize, 250)
</script>

<svelte:window on:resize={debouncedHandleResize} />

<canvas
  class="absolute top-0 left-0 bg-gradient-to-b from-neutral-900 to-neutral-800 from-80% to-100% w-screen h-[calc(100dvh)]"
  bind:this={canvas}
/>
