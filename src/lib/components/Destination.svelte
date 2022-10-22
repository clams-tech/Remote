<script lang="ts">
  import lodashDebounce from 'lodash.debounce'
  import { decode } from 'light-bolt11-decoder'
  import type { PaymentType } from '$lib/types'
  import TextInput from '$lib/elements/TextInput.svelte'
  import { onMount } from 'svelte'
  import Paste from '$lib/icons/Paste.svelte'
  import Button from '$lib/elements/Button.svelte'
  import Modal, { closeModal } from '../elements/Modal.svelte'
  import { translate } from '$lib/i18n/translations'
  import { modal$ } from '$lib/streams'
  import { Modals } from '$lib/types'
  import Arrow from '$lib/icons/Arrow.svelte'
  import { createEventDispatcher, onDestroy } from 'svelte'

  import {
    formatDecodedInvoice,
    getClipboardPermissions,
    readClipboardValue,
    getPaymentType
  } from '$lib/utils'

  export let destination: string
  export let type: PaymentType | null
  export let description = ''
  export let expiry: number | null = null
  export let timestamp: number | null = null
  export let amount = '0'
  export let next: () => void
  export let readonly = false

  let error = ''
  let blurTimeout: NodeJS.Timeout

  const dispatch = createEventDispatcher()

  $: if (destination) {
    error = ''
    type = getPaymentType(destination) || null

    if (type === 'payment_request') {
      try {
        const decodedInvoice = decode(destination)
        const formattedInvoice = formatDecodedInvoice(decodedInvoice)

        amount = formattedInvoice.amount || '0'
        expiry = formattedInvoice.expiry || 3600
        description = formattedInvoice.description || ''
        timestamp = formattedInvoice.timestamp
      } catch (e) {
        error = $translate('app.inputs.destination.invalid_invoice')
      }
    }

    debouncedValidate()
  }

  onDestroy(() => {
    blurTimeout && clearTimeout(blurTimeout)
  })

  function validate() {
    blurTimeout = setTimeout(() => {
      error = !destination ? 'required' : !type ? $translate('app.inputs.destination.error') : ''
    }, 500)
  }

  const debouncedValidate = lodashDebounce(validate, 500)

  type ClipboardValue = { value: string; type: PaymentType }

  let clipboard: null | ClipboardValue
  let focusInput: () => void

  async function checkClipboard(): Promise<ClipboardValue | null> {
    const clipboardValue = await readClipboardValue()

    if (clipboardValue) {
      const paymentType = getPaymentType(clipboardValue)

      if (paymentType) {
        return {
          value: clipboardValue,
          type: paymentType
        }
      }
    }

    return null
  }

  async function paste() {
    const clipboardValue = await checkClipboard()

    if (clipboardValue) {
      destination = clipboardValue.value
      type = clipboardValue.type
    } else {
      dispatch('clipboardError', $translate('app.errors.permissions_clipboard'))
    }
  }

  onMount(async () => {
    // wait for animation to complete to focus
    setTimeout(focusInput, 500)

    if (destination) return

    const clipboardPermission = await getClipboardPermissions()

    if (clipboardPermission) {
      setTimeout(async () => {
        clipboard = await checkClipboard()
        if (clipboard) {
          modal$.next(Modals.clipboard)
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
    invalid={error}
  >
    <div on:click|stopPropagation={paste} class="w-6 absolute right-2 bottom-2 cursor-pointer">
      <Paste />
    </div>
  </TextInput>

  <div class="mt-6 w-full">
    <Button on:click={next} text={$translate('app.buttons.next')} primary disabled={!!error}>
      <div slot="iconRight" class="w-6">
        <Arrow direction="right" />
      </div>
    </Button>
  </div>

  {#if $modal$ === Modals.clipboard && clipboard}
    <Modal>
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
