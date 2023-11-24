<script lang="ts">
  import type { DecodedBolt11Invoice } from '$lib/@types/invoices.js'
  import Msg from '$lib/components/Msg.svelte'
  import Section from '$lib/components/Section.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import { decodeBolt11 } from '$lib/invoices.js'
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
  import ExpiryCountdown from '$lib/components/ExpiryCountdown.svelte'
  import type { AppError } from '$lib/@types/errors.js'
  import { connections$, settings$, wallets$ } from '$lib/streams.js'
  import type { Connection } from '$lib/wallets/interfaces.js'
  import { createRandomHex } from '$lib/crypto.js'
  import { db } from '$lib/db/index.js'
  import { goto } from '$app/navigation'
  import { slide } from 'svelte/transition'
  import { combineLatest, map } from 'rxjs'
  import ErrorDetail from '$lib/components/ErrorDetail.svelte'
  import { nowSeconds, getNodeInfo } from '$lib/utils.js'
  import Spinner from '$lib/components/Spinner.svelte'

  export let data: PageData

  let decodeError = ''
  let selectedWalletId: Wallet['id']
  let paying = false
  let payingError: AppError | null = null

  const decoded = decodeBolt11(data.invoice) as DecodedBolt11Invoice

  const availableWallets$ = combineLatest([wallets$, connections$]).pipe(
    map(([wallets, connections]) =>
      wallets.filter(({ id, nodeId }) => {
        const connection = connections.find(({ walletId }) => walletId === id)
        return !!connection?.invoices?.pay
      })
    )
  )

  if (!decoded) {
    decodeError = $translate('app.errors.bolt11_decode')
  }

  let amountSats: number

  if (decoded.amount) {
    amountSats = decoded.amount
  }

  const pay = async () => {
    paying = true
    payingError = null

    try {
      const connection = connections$.value.find(
        ({ walletId }) => walletId === selectedWalletId
      ) as Connection

      if (!connection.invoices?.pay) {
        throw {
          key: 'connection_unsupported_action',
          detail: {
            timestamp: nowSeconds(),
            message: 'Wallet cannot pay BOLT11 invoice',
            context: 'Paying BOLT11'
          }
        }
      }

      const paid = await connection.invoices.pay({
        request: data.invoice,
        id: createRandomHex(),
        amount: !decoded.amount ? amountSats : undefined
      })

      await db.payments.add(paid)
      await goto(`/payments/${paid.id}?wallet=${paid.walletId}`)
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
    <div class="w-8 mr-1.5 -ml-2">{@html lightning}</div>
    <div>
      {$translate('app.labels.invoice')}
    </div>
  </div>

  {#if decodeError}
    <Msg type="error" message={decodeError} closable={false} />
  {:else}
    {@const { description, expiresAt, nodeId } = decoded}

    <div class="flex items-center w-full justify-center text-2xl">
      <BitcoinAmount sats={amountSats || 0} />
    </div>

    <div class="w-full mt-6">
      <SummaryRow>
        <div slot="label">{$translate('app.labels.destination')}:</div>
        <div slot="value">
          {#await getNodeInfo({ nodePubkey: nodeId })}
            <Spinner size="1rem" />
          {:then node}
            {#if node?.alias}
              <b>{node.alias}</b>
            {:else}
              <CopyValue value={nodeId} truncateLength={9} />
            {/if}
          {/await}
        </div>
      </SummaryRow>

      {#if description}
        <SummaryRow>
          <div slot="label">{$translate('app.labels.description')}:</div>
          <div slot="value">{description}</div>
        </SummaryRow>
      {/if}

      <SummaryRow>
        <div slot="label">{$translate('app.labels.expires')}:</div>
        <div slot="value">
          <ExpiryCountdown label={false} expiry={expiresAt} />
        </div>
      </SummaryRow>

      <div class="mt-6 flex flex-col gap-y-4">
        {#if $availableWallets$}
          <WalletSelector
            autoSelectLast="sent"
            bind:selectedWalletId
            wallets={$availableWallets$}
          />
        {:else}
          <Msg message={$translate('app.errors.wallet_pay_invoice_unavailable')} type="info" />
        {/if}

        {#if !decoded.amount}
          <TextInput
            label={$translate('app.labels.custom_amount')}
            name="amount"
            bind:value={amountSats}
            type="number"
            sats={amountSats}
          />
        {/if}
      </div>

      <div class="w-full flex items-center justify-between mt-6">
        <div class="w-12 -ml-2">
          {#if !decoded.amount && $settings$.fiatDenomination !== 'none'}
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
  {/if}
</Section>
