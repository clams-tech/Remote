<script lang="ts">
  import { goto } from '$app/navigation'
  import type { Wallet } from '$lib/@types/wallets.js'
  import type { AppError } from '$lib/@types/errors.js'
  import Calculator from '$lib/components/Calculator.svelte'
  import ErrorDetail from '$lib/components/ErrorDetail.svelte'
  import type { Connection } from '$lib/wallets/interfaces.js'
  import { DAY_IN_SECS } from '$lib/constants.js'
  import { createRandomHex } from '$lib/crypto.js'
  import { db } from '$lib/db/index.js'
  import Button from '$lib/components/Button.svelte'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import TextInput from '$lib/components/TextInput.svelte'
  import Toggle from '$lib/components/Toggle.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import plus from '$lib/icons/plus.js'
  import { connections$, settings$, wallets$ } from '$lib/streams.js'
  import { nowSeconds } from '$lib/utils.js'
  import { slide } from 'svelte/transition'
  import WalletSelector from '$lib/components/WalletSelector.svelte'
  import { combineLatest, map } from 'rxjs'
  import ShowMoar from '$lib/components/ShowMoar.svelte'
  import ExpirySelector from '$lib/components/ExpirySelector.svelte'
  import type { AddressPayment } from '$lib/@types/payments.js'
  import Msg from '$lib/components/Msg.svelte'

  let selectedWalletId: Wallet['id']
  let amount: number
  let expiry = DAY_IN_SECS
  let description = ''
  let creatingPayment = false
  let createPaymentError: AppError | null = null
  let connection: Connection | null

  let createAddress = false
  let createInvoice = false

  const availableWallets$ = combineLatest([wallets$, connections$]).pipe(
    map(([wallets, connections]) =>
      wallets.filter(({ id }) => {
        const connection = connections.find(({ walletId }) => walletId === id)
        return !!connection?.invoices?.create || !connection?.transactions?.receive
      })
    )
  )

  const handleselectedWalletIdChange = () => {
    connection = $connections$.find(
      connection => connection.walletId === selectedWalletId
    ) as Connection

    if (connection) {
      if (connection.invoices?.create) {
        setTimeout(() => (createInvoice = true), 50)
      } else if (connection.transactions?.receive) {
        setTimeout(() => (createAddress = true), 50)
      }
    }
  }

  $: if (selectedWalletId && $connections$) {
    handleselectedWalletIdChange()
  }

  const createPayment = async () => {
    if (!connection) return

    creatingPayment = true
    createPaymentError = null

    const id = createRandomHex()

    if (typeof amount !== 'number') {
      amount = 0
    }

    try {
      if (createInvoice && connection.invoices?.create) {
        const invoice = await connection.invoices.create({
          id,
          amount,
          description,
          expiry
        })

        await db.payments.add(invoice)
      }

      if (createAddress && connection.transactions?.receive) {
        const receiveAddress = await connection.transactions.receive()

        const createdAt = nowSeconds()

        const address: AddressPayment = {
          id: receiveAddress,
          walletId: selectedWalletId,
          timestamp: createdAt,
          status: 'waiting',
          direction: 'receive',
          network: connection.info.network,
          type: 'address',
          data: {
            createdAt,
            amount,
            message: description
          }
        }

        await db.payments.add(address)
      }
    } catch (error) {
      createPaymentError = error as AppError
    } finally {
      creatingPayment = false
    }

    if (!createPaymentError) {
      await goto(`/payments/${id}`)
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

<svelte:window on:keyup|stopPropagation={handleKeyPress} />

<Section>
  <div class="flex items-center justify-between">
    <SectionHeading icon={plus} />
  </div>

  {#if $availableWallets$}
    <WalletSelector autoSelectLast="received" bind:selectedWalletId wallets={$availableWallets$} />
  {:else}
    <Msg message={$translate('app.errors.wallet_receive_unavailable')} type="info" />
  {/if}

  <div class="my-4">
    <div class="mb-2 text-neutral-300 font-semibold text-sm">
      {$translate('app.labels.create')}
    </div>

    <div class="flex items-center border rounded border-neutral-600 p-4 bg-neutral-900">
      {#if connection && connection.invoices?.create}
        <div in:slide class="flex items-center">
          <Toggle bind:toggled={createInvoice}>
            <div slot="right" class="ml-2">{$translate('app.labels.invoice')}</div>
          </Toggle>
        </div>
      {/if}

      {#if connection && connection.transactions?.receive}
        <div in:slide class="flex items-center ml-4">
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
    hint={!amount ? $translate('app.labels.any_amount') : ''}
    sats={amount}
  />

  <div class="text-sm mt-4">
    <ShowMoar label={$translate('app.labels.more_options')}>
      <div class="w-full flex flex-col gap-y-4">
        {#if createInvoice}
          <div transition:slide>
            <ExpirySelector bind:expiry />
          </div>
        {/if}

        <TextInput
          type="text"
          label={$translate('app.labels.description')}
          name="description"
          bind:value={description}
          hint={$translate('app.labels.optional')}
          placeholder={$translate('app.labels.invoice_description_placeholder')}
        />
      </div>
    </ShowMoar>
  </div>

  <div class="w-full flex items-center justify-between mt-6">
    {#if $settings$.fiatDenomination !== 'none'}
      <div class="w-12 -ml-1">
        <Calculator bind:showModal={modalShowing} on:amount={({ detail }) => (amount = detail)} />
      </div>
    {/if}

    <div class="w-min">
      <Button
        on:click={createPayment}
        requesting={creatingPayment}
        text={$translate('app.labels.create')}
        disabled={!connection}
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
