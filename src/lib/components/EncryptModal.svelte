<script lang="ts">
  import Modal from '$lib/elements/Modal.svelte'
  import { translate } from '$lib/i18n/translations'
  import { modal$, pin$ } from '$lib/streams'
  import { Modals } from '$lib/types'
  import { onDestroy } from 'svelte'
  import PinEntry from './PinEntry.svelte'

  export let resetOption = true
  let pin: string

  function savePin() {
    modal$.next(Modals.none)
    pin$.next(pin)
  }

  onDestroy(() => {
    if (pin.length < 4) {
      pin$.next(null)
    }
  })
</script>

<Modal>
  <h2 class="p-4 md:mb-6 mb-4 font-semibold text-xl md:text-2xl">
    {$translate('app.headings.encrypt')}
  </h2>

  <PinEntry {resetOption} bind:pin on:complete={savePin} />
</Modal>
