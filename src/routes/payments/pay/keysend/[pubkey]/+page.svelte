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
  import { createRandomHex } from '$lib/crypto.js'
  import { db } from '$lib/db/index.js'
  import { goto } from '$app/navigation'
  import { slide } from 'svelte/transition'
  import { TLV_RECORDS } from '$lib/constants.js'
  import { nowSeconds, stringToHex } from '$lib/utils.js'
  import { combineLatest, map } from 'rxjs'
  import ErrorDetail from '$lib/components/ErrorDetail.svelte'
  import { getNodeInfo } from '../../../utils.js'
  import Spinner from '$lib/components/Spinner.svelte'
  import ShowMoar from '$lib/components/ShowMoar.svelte'

  export let data: PageData

  let selectedWalletId: Wallet['id']
  let paying = false
  let payingError: AppError | null = null

  let amountSats: number
  let message = ''

  const availableWallets$ = combineLatest([wallets$, connections$]).pipe(
    map(([wallets, connections]) =>
      wallets.filter(({ id, nodeId }) => {
        const connection = connections.find(({ walletId }) => walletId === id)
        return !!connection?.invoices?.keysend
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

      if (!connection.invoices?.keysend) {
        throw {
          key: 'connection_unsupported_action',
          detail: {
            timestamp: nowSeconds(),
            message: 'Wallet is not able to send keysend payment',
            context: 'Paying pubkey'
          }
        }
      }

      const paid = await connection.invoices.keysend({
        id: createRandomHex(),
        destination: data.pubkey,
        amount: amountSats,
        tlvs: message ? { [TLV_RECORDS.message]: stringToHex(message) } : undefined
      })

      await db.invoices.add(paid)
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
    <div class="w-8 mr-1.5 -ml-2">{@html lightning}</div>
    <div>
      {$translate('app.labels.keysend')}
    </div>
  </div>

  <div class="flex items-center w-full justify-center text-2xl">
    <BitcoinAmount sats={amountSats || 0} />
  </div>

  <div class="w-full mt-6">
    <SummaryRow>
      <div slot="label">{$translate('app.labels.destination')}:</div>
      <div slot="value">
        {#await getNodeInfo(data.pubkey)}
          <Spinner size="1rem" />
        {:then node}
          {#if node?.alias}
            <b>{node.alias}</b>
          {:else}
            <CopyValue value={data.pubkey} truncateLength={9} />
          {/if}
        {/await}
      </div>
    </SummaryRow>

    <div class="mt-6 flex flex-col gap-y-4">
      {#if $availableWallets$}
        <WalletSelector autoSelectLast="sent" bind:selectedWalletId wallets={$availableWallets$} />
      {:else}
        <Msg message={$translate('app.labels.wallet_keysend_unavailable')} type="info" />
      {/if}

      <TextInput
        label={$translate('app.labels.amount')}
        name="amount"
        bind:value={amountSats}
        type="number"
        sats={amountSats || 0}
      />

      <div class="w-full text-sm">
        <ShowMoar label={$translate('app.labels.more_options')}>
          <div class="w-full flex flex-col gap-y-4">
            <TextInput
              label={$translate('app.labels.message')}
              name="message"
              bind:value={message}
              type="textarea"
              rows={3}
              hint={$translate('app.labels.optional')}
            />
          </div>
        </ShowMoar>
      </div>
    </div>

    <div class="w-full flex items-center justify-between mt-6">
      {#if $settings$.fiatDenomination !== 'none'}
        <div class="w-12 -ml-2">
          <Calculator on:amount={e => (amountSats = e.detail)} />
        </div>
      {/if}
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
