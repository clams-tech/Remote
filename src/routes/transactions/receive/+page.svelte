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
  import Button from '$lib/elements/Button.svelte'
  import Connection from '$lib/elements/Connection.svelte'
  import Msg from '$lib/elements/Msg.svelte'
  import Section from '$lib/elements/Section.svelte'
  import SectionHeading from '$lib/elements/SectionHeading.svelte'
  import TextInput from '$lib/elements/TextInput.svelte'
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

  const createPayment = async () => {
    creatingPayment = true
    createPaymentError = null

    try {
      const connectionInterface = $connections$.find(
        (connection) => connection.connectionId === selectedConnectionId
      ) as ConnectionInterface

      if (
        connectionInterface.connect &&
        connectionInterface.connectionStatus$.value === 'disconnected'
      ) {
        await connectionInterface.connect()
      }

      // prefer bolt11 if available
      if (connectionInterface.invoices?.createInvoice) {
        const invoice = await connectionInterface.invoices.createInvoice({
          id: createRandomHex(),
          amount: amount ? Big(amount).times(1000).toString() : 'any',
          description: '',
          expiry: 2 * DAY_IN_SECS
        })

        await db.invoices.add(invoice)
        await goto(`/transactions/${invoice.id}`)
      }
      // otherwise an onchain address
      else if (connectionInterface.transactions?.receive) {
        const receiveAddress = await connectionInterface.transactions.receive()

        const address: Address = {
          id: receiveAddress,
          connectionId: selectedConnectionId,
          createdAt: nowSeconds(),
          amount: 'any',
          description: ''
        }

        await db.addresses.add(address)
        await goto(`/transactions/${address.id}`)
      }
      // no way to receive
      else {
        throw {
          key: 'connection_cannot_receive_payment',
          detail: {
            timestamp: nowSeconds(),
            message: 'The selected connection cannot receive via lightning or onchain',
            context: 'Creating a payment to receive funds',
            connectionId: selectedConnectionId
          }
        }
      }
    } catch (error) {
      createPaymentError = error as AppError
    } finally {
      creatingPayment = false
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
      <Msg closable={false} message={$translate('app.labels.add_connection')} type="info" />
    {:else}
      <div class="mt-4 mb-6">
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
            text="Create payment"
            primary
          >
            <div class="w-6 ml-1 -mr-2" slot="iconRight">{@html plus}</div>
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
