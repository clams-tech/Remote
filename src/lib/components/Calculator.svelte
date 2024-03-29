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
  import { createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher()

  export let showModal = false
  let fiat: number
  let exchange: number
  let sats: number
  let focusInput: () => void

  $: if (showModal) {
    exchange = ($bitcoinExchangeRates$ && $bitcoinExchangeRates$[$settings$.fiatDenomination]) || 0
    sats = fiat ? (1 / (exchange || 1)) * fiat * 1e8 : 0
  }

  $: if (showModal && focusInput) {
    focusInput()
  }

  const setAmount = () => {
    dispatch('amount', sats ? Math.round(sats) : 0)
    showModal = false
    fiat = 0
    sats = 0
  }

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      setAmount()
    }
  }
</script>

{#if $bitcoinExchangeRates$}
  <button on:click={() => (showModal = true)} class="w-full flex items-center"
    >{@html calculator}</button
  >
{/if}

{#if showModal}
  <Modal on:close={() => (showModal = false)}>
    <button class="w-full" on:keyup|stopPropagation={handleKeyPress}>
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
        <BitcoinAmount {sats} />
      </div>

      <div class="w-full flex justify-end">
        <div class="w-min">
          <Button primary on:click={setAmount} text={$translate('app.labels.set_amount')} />
        </div>
      </div>
    </button>
  </Modal>
{/if}
