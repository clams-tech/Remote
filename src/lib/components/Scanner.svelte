<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import QrScanner from 'qr-scanner'
  import debounce from 'lodash.debounce'
  import { translate } from '$lib/i18n/translations'
  import BackButton from '$lib/elements/BackButton.svelte'
  import { goto } from '$app/navigation'
  import { noop } from '$lib/utils'
  import { customNotifications$ } from '$lib/streams'

  export let onResult
  export let onError = noop

  const debouncedOnResult = debounce(onResult, 200)

  let videoEl: HTMLVideoElement
  let qrScanner: QrScanner

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
      customNotifications$.next({
        id: window.crypto.randomUUID(),
        type: 'error',
        heading: $translate('app.errors.camera'),
        message: $translate('app.errors.camera_connection')
      })
    }
  })

  onDestroy(() => {
    qrScanner.stop()
  })
</script>

<div class="container relative items-center flex justify-center w-full">
  <BackButton on:click={() => goto('/')} />

  <!-- svelte-ignore a11y-media-has-caption -->
  <video bind:this={videoEl} />
</div>

<style>
  .container {
    min-height: 100vh;
    /* mobile viewport bug fix */
    min-height: -webkit-fill-available;
  }
</style>
