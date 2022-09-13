<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import QrScanner from 'qr-scanner'
  // https://github.com/nimiq/qr-scanner
  import debounce from 'lodash.debounce'
  import { translate } from '$lib/i18n/translations'
  import BackButton from '$lib/elements/BackButton.svelte'
  import { goto } from '$app/navigation'
  import { noop } from '$lib/utils'

  export let onResult
  export let onError = noop

  const debouncedOnResult = debounce(onResult, 200)

  let videoEl: HTMLVideoElement
  let qrScanner: QrScanner
  let displayError = false

  onMount(async () => {
    try {
      qrScanner = new QrScanner(videoEl, ({ data }) => debouncedOnResult(data), {
        onDecodeError: onError,
        preferredCamera: 'environment',
        highlightScanRegion: true,
        highlightCodeOutline: true
      })

      await qrScanner.start()
    } catch (error) {
      displayError = true
    }
  })

  onDestroy(() => {
    qrScanner.stop()
  })
</script>

<div class="container relative items-center flex justify-center w-full">
  <BackButton on:click={() => goto('/')} />

  <!-- svelte-ignore a11y-media-has-caption -->
  <video bind:this={videoEl} class="rounded-xl overflow-hidden" />

  {#if displayError}
    <div>
      {$translate('app.errors.camera_connection')}
    </div>
  {/if}
</div>

<style>
  .container {
    min-height: 100vh;
    /* mobile viewport bug fix */
    min-height: -webkit-fill-available;
  }
</style>
