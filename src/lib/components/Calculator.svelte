<script lang="ts">
  import { CURRENCY_SYMBOLS } from '$lib/constants.js'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import Button from '$lib/components/Button.svelte'
  import Modal from '$lib/components/Modal.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import TextInput from '$lib/components/TextInput.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import calculator from '$lib/icons/calculator.js'
  import { bitcoinExchangeRates$, settings$ } from '$lib/streams.js'
  import Big from 'big.js'
  import { createEventDispatcher } from 'svelte'
  import { satsToMsats } from '$lib/conversion.js'

  const dispatch = createEventDispatcher()

  export let showModal = false
  let fiat: number
  let exchange: number
  let sats: number
  let focusInput: () => void

  $: if (showModal) {
    exchange = ($bitcoinExchangeRates$ && $bitcoinExchangeRates$[$settings$.fiatDenomination]) || 0

    sats = fiat
      ? Big(1)
          .div(exchange || 1)
          .times(fiat)
          .times(1e8)
          .toNumber()
      : 0
  }

  $: if (showModal && focusInput) {
    focusInput()
  }

  const setAmount = () => {
    dispatch('amount', sats || 0)
    showModal = false
    fiat = 0
    sats = 0
  }

  const handleKeyPress = (e: KeyboardEvent) => {
    if (showModal) {
      if (e.key === 'Enter') {
        setAmount()
      }
    }
  }
</script>

<svelte:window on:keyup|stopPropagation={handleKeyPress} />

<button on:click={() => (showModal = true)} class="w-full flex items-center"
  >{@html calculator}</button
>

{#if showModal}
  <Modal on:close={() => (showModal = false)}>
    <div class="w-full">
      <SectionHeading text={$translate('app.labels.fiat_calculator')} icon={calculator} />
      <TextInput
        bind:focus={focusInput}
        type="number"
        bind:value={fiat}
        name="fiat"
        label={`${$settings$.fiatDenomination.toUpperCase()}${
          CURRENCY_SYMBOLS[$settings$.fiatDenomination]
        }`}
      />

      <div class="mt-4 mb-6 text-2xl">
        <BitcoinAmount msat={satsToMsats(sats)} />
      </div>

      <div class="w-full flex justify-end">
        <div class="w-min">
          <Button primary on:click={setAmount} text={$translate('app.labels.set_amount')} />
        </div>
      </div>
    </div>
  </Modal>
{/if}
