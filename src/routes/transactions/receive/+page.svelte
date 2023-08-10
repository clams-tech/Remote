<script lang="ts">
  import { goto } from '$app/navigation'
  import type { Address } from '$lib/@types/addresses.js'
  import type { ConnectionDetails } from '$lib/@types/connections.js'
  import type { AppError } from '$lib/@types/errors.js'
  import Calculator from '$lib/components/Calculator.svelte'
  import ErrorDetail from '$lib/components/ErrorDetail.svelte'
  import type { ConnectionInterface } from '$lib/connections/interfaces.js'
  import { DAY_IN_SECS, STORAGE_KEYS } from '$lib/constants.js'
  import { createRandomHex } from '$lib/crypto.js'
  import { db } from '$lib/db.js'
  import Button from '$lib/components/Button.svelte'
  import Connection from '$lib/components/Connection.svelte'
  import Msg from '$lib/components/Msg.svelte'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import TextInput from '$lib/components/TextInput.svelte'
  import Toggle from '$lib/components/Toggle.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import plus from '$lib/icons/plus.js'
  import { log, storage } from '$lib/services.js'
  import { connections$ } from '$lib/streams.js'
  import { nowSeconds } from '$lib/utils.js'
  import Big from 'big.js'
  import { liveQuery } from 'dexie'
  import { slide } from 'svelte/transition'

  let selectedConnectionId: ConnectionDetails['id']
  let amount = 0
  let creatingPayment = false
  let createPaymentError: AppError | null = null
  let connectionInterface: ConnectionInterface | null

  let createAddress = false
  let createInvoice = false

  const storedConnections$ = liveQuery(() => db.connections.toArray())

  try {
    const lastReceiveConnectionId = storage.get(STORAGE_KEYS.lastReceiveConnection)

    if (lastReceiveConnectionId) {
      selectedConnectionId = lastReceiveConnectionId
    }
  } catch (error) {
    log.warn('Access to storage denied when trying to retrieve last received connection id')
  }

  const selectConnection = (id: ConnectionDetails['id']) => {
    selectedConnectionId = id

    try {
      storage.write(STORAGE_KEYS.lastReceiveConnection, id)
    } catch (error) {
      log.warn('Access to storage denied when trying to write last received connection id')
    }
  }

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
  <div class="flex items-center justify-between">
    <SectionHeading icon={plus} />
    <div class="w-10">
      <Calculator bind:showModal={modalShowing} on:amount={({ detail }) => (amount = detail)} />
    </div>
  </div>

  {#if $storedConnections$}
    {#if !$storedConnections$.length}
      <div class="mt-4">
        <Msg closable={false} message={$translate('app.labels.add_connection')} type="info" />
      </div>
    {:else}
      <div class="mt-4 mb-6">
        <div class="mb-2 text-neutral-300 font-semibold text-sm">
          {$translate('app.labels.to')}
        </div>
        <div class="flex w-full flex-wrap gap-2 rounded">
          {#each $storedConnections$ as connection}
            <Connection
              selected={selectedConnectionId === connection.id}
              on:click={() => selectConnection(connection.id)}
              data={connection}
            />
          {/each}
        </div>
      </div>

      <div class="mb-6">
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
    {/if}
  {/if}
</Section>

{#if createPaymentError}
  <div in:slide>
    <ErrorDetail error={createPaymentError} />
  </div>
{/if}
