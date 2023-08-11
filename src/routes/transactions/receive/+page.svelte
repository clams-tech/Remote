<script lang="ts">
  import { goto } from '$app/navigation'
  import type { Address } from '$lib/@types/addresses.js'
  import type { ConnectionDetails } from '$lib/@types/connections.js'
  import type { AppError } from '$lib/@types/errors.js'
  import Calculator from '$lib/components/Calculator.svelte'
  import ErrorDetail from '$lib/components/ErrorDetail.svelte'
  import type { ConnectionInterface } from '$lib/connections/interfaces.js'
  import { DAY_IN_SECS } from '$lib/constants.js'
  import { createRandomHex } from '$lib/crypto.js'
  import { db } from '$lib/db.js'
  import Button from '$lib/components/Button.svelte'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import TextInput from '$lib/components/TextInput.svelte'
  import Toggle from '$lib/components/Toggle.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import plus from '$lib/icons/plus.js'
  import { connections$ } from '$lib/streams.js'
  import { nowSeconds } from '$lib/utils.js'
  import Big from 'big.js'
  import { slide } from 'svelte/transition'
  import ConnectionSelector from '$lib/components/ConnectionSelector.svelte'

  let selectedConnectionId: ConnectionDetails['id']
  let amount = 0
  let creatingPayment = false
  let createPaymentError: AppError | null = null
  let connectionInterface: ConnectionInterface | null

  let createAddress = false
  let createInvoice = false

  const handleSelectedConnectionIdChange = () => {
    connectionInterface = $connections$.find(
      (connection) => connection.connectionId === selectedConnectionId
    ) as ConnectionInterface

    if (connectionInterface) {
      if (connectionInterface.invoices?.create) {
        createInvoice = true
      } else if (connectionInterface.transactions?.receive) {
        createAddress = true
      }
    }
  }

  $: if (selectedConnectionId && $connections$) {
    handleSelectedConnectionIdChange()
  }

  const createPayment = async () => {
    if (!connectionInterface) return

    creatingPayment = true
    createPaymentError = null

    const id = createRandomHex()

    try {
      if (
        connectionInterface.connect &&
        connectionInterface.connectionStatus$.value === 'disconnected'
      ) {
        await connectionInterface.connect()
      }

      if (createInvoice && connectionInterface.invoices?.create) {
        const invoice = await connectionInterface.invoices.create({
          id,
          amount: amount ? Big(amount).times(1000).toString() : 'any',
          description: '',
          expiry: 2 * DAY_IN_SECS
        })

        await db.invoices.add(invoice)
      }

      if (createAddress && connectionInterface.transactions?.receive) {
        const receiveAddress = await connectionInterface.transactions.receive()

        const address: Address = {
          id,
          value: receiveAddress,
          connectionId: selectedConnectionId,
          createdAt: nowSeconds(),
          amount: amount ? Big(amount).times(1000).toString() : 'any'
        }

        await db.addresses.add(address)
      }
    } catch (error) {
      createPaymentError = error as AppError
    } finally {
      creatingPayment = false
      await goto(`/transactions/${id}`)
    }
  }

  let modalShowing: boolean

  const handleKeyPress = (e: KeyboardEvent) => {
    if (!modalShowing) {
      if (e.key === 'Enter') {
        createPayment()
      }
    }
  }
</script>

<svelte:window on:keyup={handleKeyPress} />

<Section>
  <div class="flex items-center justify-between mb-2">
    <SectionHeading icon={plus} />
    <div class="w-10">
      <Calculator bind:showModal={modalShowing} on:amount={({ detail }) => (amount = detail)} />
    </div>
  </div>

  <ConnectionSelector bind:selectedConnectionId direction="receive" />

  <div class="my-6">
    <div class="mb-2 text-neutral-300 font-semibold text-sm">
      {$translate('app.labels.create')}
    </div>

    <div class="flex items-center">
      {#if connectionInterface && connectionInterface.invoices?.create}
        <div in:slide class="flex items-center text-xs">
          <Toggle bind:toggled={createInvoice}>
            <div slot="right" class="ml-2">{$translate('app.labels.invoice')}</div>
          </Toggle>
        </div>
      {/if}

      {#if connectionInterface && connectionInterface.transactions?.receive}
        <div in:slide class="flex items-center ml-4 text-xs">
          <Toggle bind:toggled={createAddress}>
            <div slot="right" class="ml-2">{$translate('app.labels.address')}</div>
          </Toggle>
        </div>
      {/if}
    </div>
  </div>

  <TextInput
    type="number"
    bind:value={amount}
    label={$translate('app.labels.amount')}
    name="amount"
    hint={!amount ? 'Any amount' : ''}
    msat={amount ? Big(amount).times(1000).toString() : ''}
  />

  <div class="w-full flex items-center justify-end mt-6">
    <div class="w-min">
      <Button
        on:click={createPayment}
        requesting={creatingPayment}
        text={$translate('app.labels.create')}
        disabled={!connectionInterface}
        primary
      >
        <div class="w-6 mr-1 -ml-2" slot="iconLeft">{@html plus}</div>
      </Button>
    </div>
  </div>
</Section>

{#if createPaymentError}
  <div in:slide>
    <ErrorDetail error={createPaymentError} />
  </div>
{/if}
