<script lang="ts">
  import lodashDebounce from 'lodash.debounce'
  import { onMount, createEventDispatcher, onDestroy } from 'svelte'
  import type { PaymentType } from '$lib/types'
  import TextInput from '$lib/elements/TextInput.svelte'
  import Button from '$lib/elements/Button.svelte'
  import Modal from '../elements/Modal.svelte'
  import { translate } from '$lib/i18n/translations'
  import pasteIcon from '$lib/icons/paste'
  import arrow from '$lib/icons/arrow'

  import {
    getClipboardPermissions,
    readClipboardValue,
    parseBitcoinUrl,
    decodeBolt11
  } from '$lib/utils'

  export let destination: string
  export let type: PaymentType | null
  export let description = ''
  export let expiry: number | null = null
  export let timestamp: number | null = null
  export let amount = '0'
  export let next: () => void
  export let readonly = false

  const dispatch = createEventDispatcher()

  let errorMsg = ''
  let blurTimeout: NodeJS.Timeout
  let showClipboardModal = false

  function closeModal() {
    showClipboardModal = false
  }

  function handleDestinationChange() {
    errorMsg = ''

    const { error, bolt11, type: destinationType } = parseBitcoinUrl(destination)

    if (error) {
      errorMsg = error
      return
    }

    type = destinationType

    if (bolt11) {
      const decodedInvoice = decodeBolt11(bolt11)

      if (!decodedInvoice) {
        errorMsg = $translate('app.inputs.destination.invalid_bolt11')
        return
      }

      amount = decodedInvoice.amount || '0'
      expiry = decodedInvoice.expiry || 3600
      description = decodedInvoice.description || ''
      timestamp = decodedInvoice.timestamp
    }

    debouncedValidate()
  }

  $: if (destination) {
    handleDestinationChange()
  }

  onDestroy(() => {
    blurTimeout && clearTimeout(blurTimeout)
  })

  function validate() {
    blurTimeout = setTimeout(() => {
      if (!destination) {
        errorMsg = $translate('app.validation.required')
        return
      }

      if (!type) {
        errorMsg = $translate('app.inputs.destination.error')
        return
      }

      if (type === 'onchain') {
        errorMsg = $translate('app.errors.onchain_unsupported')
        return
      }

      errorMsg = ''
    }, 500)
  }

  const debouncedValidate = lodashDebounce(validate, 500)

  type Clipboard = {
    type: PaymentType | null
    value: string
  }

  let clipboard: Clipboard | null | undefined
  let focusInput: () => void

  async function checkClipboard(): Promise<Clipboard | null | undefined> {
    const clipboardValue = await readClipboardValue()

    if (clipboardValue === null) return clipboardValue

    if (clipboardValue) {
      const { error, bolt11, lnurl, keysend, onchain, type } = parseBitcoinUrl(clipboardValue)

      if (!error) {
        return {
          value: (bolt11 || lnurl || keysend || onchain?.address) as string,
          type
        }
      }
    }
  }

  async function paste() {
    const clipboard = await checkClipboard()

    if (clipboard === null) {
      dispatch('clipboardError', $translate('app.errors.permissions_clipboard'))
    }

    if (clipboard) {
      type = clipboard.type
      destination = clipboard.value
    }
  }

  onMount(async () => {
    // wait for animation to complete then focus input
    setTimeout(focusInput, 500)

    // already have a destination
    if (destination) return

    const clipboardPermission = await getClipboardPermissions()

    if (clipboardPermission) {
      setTimeout(async () => {
        clipboard = await checkClipboard()

        if (clipboard) {
          showClipboardModal = true
        }
      }, 250)
    }
  })
</script>

<section class="flex flex-col justify-center items-start w-full p-6 max-w-lg">
  <div class="mb-6">
    <h1 class="text-4xl font-bold mb-4">{$translate('app.headings.destination')}</h1>
    <p class="text-neutral-600 dark:text-neutral-400 italic">
      {$translate('app.subheadings.destination')}
    </p>
  </div>

  <TextInput
    bind:focus={focusInput}
    label={$translate('app.inputs.destination.label')}
    hint={type ? $translate('app.inputs.destination.hint', { paymentType: type }) : ''}
    placeholder={$translate('app.inputs.destination.placeholder')}
    type="textarea"
    rows={8}
    bind:value={destination}
    name="to"
    {readonly}
    on:blur={validate}
    invalid={errorMsg}
  >
    <button on:click|stopPropagation={paste} class="w-6 absolute right-2 bottom-2 cursor-pointer">
      {@html pasteIcon}
    </button>
  </TextInput>

  <div class="mt-6 w-full">
    <Button on:click={next} text={$translate('app.buttons.next')} primary disabled={!!errorMsg}>
      <div slot="iconRight" class="w-6 -rotate-90">
        {@html arrow}
      </div>
    </Button>
  </div>

  {#if showClipboardModal && clipboard}
    <Modal on:close={closeModal}>
      <div class="flex flex-col justify-center items-center">
        <p class="font-semibold mb-4 text-center">
          {$translate('app.modals.clipboard.paragraph_one', { paymentType: clipboard.type })}
        </p>

        <p class="text-center text-neutral-600 text-sm">
          {$translate('app.modals.clipboard.paragraph_two', { paymentType: clipboard.type })}
        </p>

        <div class="flex w-full items-center mt-4">
          <div class="w-1/2 mr-2">
            <Button on:click={closeModal} text={$translate('app.buttons.no')} />
          </div>

          <div class="w-1/2">
            <Button
              on:click={() => {
                if (clipboard) {
                  destination = clipboard.value
                  type = clipboard.type
                  closeModal()
                }
              }}
              primary
              text={$translate('app.buttons.yes')}
            />
          </div>
        </div>
      </div>
    </Modal>
  {/if}
</section>
