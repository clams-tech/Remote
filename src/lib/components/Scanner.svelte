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
        onDecodeError: (err) => alert(err),
        preferredCamera: 'environment',
        highlightScanRegion: true,
        highlightCodeOutline: true
      })

      qrScanner.setInversionMode('both')

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
    qrScanner.destroy()
  })
</script>

<div class="container relative items-center flex-col pt-16 pb-4 flex justify-center w-full h-full">
  <BackButton on:click={() => goto('/')} />

  <!-- svelte-ignore a11y-media-has-caption -->
  <video muted playsinline bind:this={videoEl} class="rounded-xl overflow-hidden" />
</div>

<style>
  .container {
    /* mobile viewport bug fix */
    min-height: -webkit-fill-available;
  }
</style>
