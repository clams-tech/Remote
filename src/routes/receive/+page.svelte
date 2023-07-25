<script lang="ts">
  import { goto } from '$app/navigation'
  import type { Address } from '$lib/@types/addresses.js'
  import type { ConnectionDetails } from '$lib/@types/connections.js'
  import type { AppError } from '$lib/@types/errors.js'
  import Calculator from '$lib/components/Calculator.svelte'
  import ErrorDetail from '$lib/components/ErrorDetail.svelte'
  import { connectionDetailsToInterface } from '$lib/connections/index.js'
  import type { Connection } from '$lib/connections/interfaces.js'
  import { DAY_IN_SECS, STORAGE_KEYS } from '$lib/constants.js'
  import { createRandomHex } from '$lib/crypto.js'
  import { db } from '$lib/db.js'
  import Button from '$lib/elements/Button.svelte'
  import Msg from '$lib/elements/Msg.svelte'
  import Section from '$lib/elements/Section.svelte'
  import SectionHeading from '$lib/elements/SectionHeading.svelte'
  import TextInput from '$lib/elements/TextInput.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import lightningOutline from '$lib/icons/lightning-outline.js'
  import receive from '$lib/icons/receive.js'
  import { log, storage } from '$lib/services.js'
  import { connections$, session$, storedConnections$ } from '$lib/streams.js'
  import { nowSeconds } from '$lib/utils.js'
  import Big from 'big.js'
  import { slide } from 'svelte/transition'

  let selectedConnection: Connection['id']
  let amount = 0
  let creatingPayment = false
  let createPaymentError: AppError | null = null

  try {
    const lastReceiveConnectionId = storage.get(STORAGE_KEYS.lastReceiveConnection)

    if (lastReceiveConnectionId) {
      selectedConnection = lastReceiveConnectionId
    }
  } catch (error) {
    log.warn('Access to storage denied when trying to retrieve last received connection id')
  }

  $: if ($storedConnections$ && $storedConnections$[0] && !selectedConnection) {
    selectConnection($storedConnections$[0].id)
  }

  const selectConnection = (id: Connection['id']) => {
    selectedConnection = id

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
      const connectionDetails = $storedConnections$.find(
        ({ id }) => id === selectedConnection
      ) as ConnectionDetails
      const connectionInterface =
        $connections$.find((connection) => connection.info.connectionId === selectedConnection) ||
        connectionDetailsToInterface(connectionDetails, $session$!)

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
          amount: Big(amount).times(1000).toString() || 'any',
          description: '',
          expiry: 2 * DAY_IN_SECS
        })

        await db.invoices.add(invoice)
        await goto(`/payments/${invoice.id}`)
      }
      // otherwise an onchain address
      else if (connectionInterface.transactions?.receive) {
        const receiveAddress = await connectionInterface.transactions.receive()

        const address: Address = {
          id: receiveAddress,
          connectionId: selectedConnection,
          createdAt: nowSeconds(),
          amount: 'any',
          description: ''
        }

        await db.addresses.add(address)
        await goto(`/payments/${address.id}`)
      }
      // no way to receive
      else {
        throw {
          key: 'connection_cannot_receive_payment',
          detail: {
            timestamp: nowSeconds(),
            message: 'The selected connection cannot receive via lightning or onchain',
            context: 'Creating a payment to receive funds',
            connectionId: selectedConnection
          }
        }
      }
    } catch (error) {
      createPaymentError = error as AppError
    } finally {
      creatingPayment = false
    }
  }
</script>

<Section>
  <div class="flex items-center justify-between">
    <SectionHeading icon={receive} />
    <div class="w-12">
      <Calculator on:amount={({ detail }) => (amount = detail)} />
    </div>
  </div>

  {#if !$storedConnections$.length}
    <Msg closable={false} message={$translate('app.labels.add_connection')} type="info" />
  {:else}
    <div class="mb-5 mt-1">
      <div class="text-sm w-1/2 text-inherit text-neutral-300 mb-2 font-semibold">
        {$translate('app.labels.connection')}
      </div>

      <div
        class="flex w-full flex-wrap gap-2 rounded font-medium px-4 py-2 border border-neutral-600 bg-neutral-900"
      >
        {#each $storedConnections$ as { label, id }}
          <button
            class:border-purple-500={selectedConnection === id}
            class="border rounded-full px-3 py-1"
            on:click={() => selectConnection(id)}>{label}</button
          >
        {/each}
      </div>
    </div>

    <TextInput
      type="number"
      bind:value={amount}
      label={$translate('app.labels.sats')}
      name="amount"
      hint={!amount ? 'Any amount' : ''}
      msat={amount ? Big(amount).times(1000).toString() : ''}
    />

    <div class="mt-6">
      <Button on:click={createPayment} text="Create payment" primary>
        <div class="w-6 ml-1" slot="iconRight">{@html lightningOutline}</div>
      </Button>
    </div>
  {/if}
</Section>

{#if createPaymentError}
  <div in:slide>
    <ErrorDetail error={createPaymentError} />
  </div>
{/if}
