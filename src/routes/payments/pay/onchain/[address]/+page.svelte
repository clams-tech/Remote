<script lang="ts">
  import Msg from '$lib/components/Msg.svelte'
  import Section from '$lib/components/Section.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import type { PageData } from './$types.js'
  import SummaryRow from '$lib/components/SummaryRow.svelte'
  import TextInput from '$lib/components/TextInput.svelte'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import lightning from '$lib/icons/lightning.js'
  import Button from '$lib/components/Button.svelte'
  import CopyValue from '$lib/components/CopyValue.svelte'
  import Calculator from '$lib/components/Calculator.svelte'
  import type { Wallet } from '$lib/@types/wallets.js'
  import WalletSelector from '$lib/components/WalletSelector.svelte'
  import type { AppError } from '$lib/@types/errors.js'
  import { connections$, settings$, wallets$ } from '$lib/streams.js'
  import type { Connection } from '$lib/wallets/interfaces.js'
  import { btcToSats } from '$lib/conversion.js'
  import { db } from '$lib/db/index.js'
  import { goto } from '$app/navigation'
  import { slide } from 'svelte/transition'
  import { log } from '$lib/services.js'
  import { combineLatest, map } from 'rxjs'
  import ErrorDetail from '$lib/components/ErrorDetail.svelte'
  import { nowSeconds } from '$lib/utils.js'

  export let data: PageData

  const { address, amount, message, label } = data
  const customAmountRequired = !amount

  let selectedWalletId: Wallet['id']
  let paying = false
  let payingError: AppError | null = null
  let amountSats: number

  if (amount) {
    amountSats = btcToSats(amount)
  }

  const availableWallets$ = combineLatest([wallets$, connections$]).pipe(
    map(([wallets, connections]) =>
      wallets.filter(({ id }) => {
        const connection = connections.find(({ walletId }) => walletId === id)
        return !!connection?.transactions?.send
      })
    )
  )

  const pay = async () => {
    paying = true
    payingError = null

    try {
      const connection = connections$.value.find(
        ({ walletId }) => walletId === selectedWalletId
      ) as Connection

      if (!connection.transactions?.send) {
        throw {
          key: 'connection_unsupported_action',
          detail: {
            timestamp: nowSeconds(),
            message: 'Wallet cannot send to an onchain address',
            context: 'Paying to onchain address'
          }
        }
      }

      const paid = await connection.transactions.send({
        amount: amountSats,
        address
      })

      if (connection.utxos?.get) {
        try {
          const updatedUtxos = await connection.utxos.get()
          await db.utxos.bulkPut(updatedUtxos)
        } catch (error) {
          const { detail } = error as AppError
          const { message } = error as Error
          log.error(detail ? detail.message : message)
        }
      }

      await db.payments.add(paid)
      await goto(`/payments/${paid.id}`)
    } catch (error) {
      payingError = error as AppError
    } finally {
      paying = false
    }
  }

  const handleKeyUp = (e: KeyboardEvent) => e.key === 'Enter' && amountSats !== 0 && pay()
</script>

<svelte:window on:keyup|stopPropagation={handleKeyUp} />

<svelte:head>
  <title>{$translate('app.routes./payment.title')}</title>
</svelte:head>

<Section>
  <div class="w-full flex justify-center items-center text-3xl font-semibold">
    <div>
      {$translate('app.labels.address')}
    </div>
  </div>

  <div class="flex items-center w-full justify-center text-2xl">
    <BitcoinAmount sats={amountSats || 0} />
  </div>

  <div class="w-full mt-6">
    <SummaryRow>
      <div slot="label">{$translate('app.labels.destination')}:</div>
      <div slot="value"><CopyValue value={address} truncateLength={9} /></div>
    </SummaryRow>

    {#if label}
      <SummaryRow>
        <div slot="label">{$translate('app.labels.label')}:</div>
        <div slot="value">{label}</div>
      </SummaryRow>
    {/if}

    {#if message}
      <SummaryRow>
        <div slot="label">{$translate('app.labels.description')}:</div>
        <div slot="value">{message}</div>
      </SummaryRow>
    {/if}

    <div class="mt-6 flex flex-col gap-y-4">
      {#if $availableWallets$}
        <WalletSelector autoSelectLast="sent" bind:selectedWalletId wallets={$availableWallets$} />
      {:else}
        <Msg message={$translate('app.errors.wallet_transaction_send_unavailable')} type="info" />
      {/if}

      {#if customAmountRequired}
        <TextInput
          label={$translate('app.labels.amount')}
          name="amount"
          bind:value={amountSats}
          type="number"
          sats={amountSats}
        />
      {/if}
    </div>

    <div class="w-full flex items-center justify-between mt-6">
      <div class="w-12 -ml-2">
        {#if customAmountRequired && $settings$.fiatDenomination !== 'none'}
          <Calculator on:amount={e => (amountSats = e.detail)} />
        {/if}
      </div>
      <div class="w-min">
        <Button
          on:click={pay}
          requesting={paying}
          disabled={!amountSats || !selectedWalletId}
          primary
          text={$translate('app.labels.pay')}
        >
          <div class="w-6 mr-1 -ml-2" slot="iconLeft">{@html lightning}</div>
        </Button>
      </div>
    </div>
  </div>

  {#if payingError}
    <div in:slide={{ axis: 'y' }} class="mt-4">
      <ErrorDetail error={payingError} />
    </div>
  {/if}
</Section>
