<script lang="ts">
  import Section from '$lib/components/Section.svelte'
  import Spinner from '$lib/components/Spinner.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import lightning from '$lib/icons/lightning.js'
  import { catchError, combineLatest, filter, from, map, of } from 'rxjs'
  import type { PageData } from './$types.js'
  import { connections$, settings$, wallets$ } from '$lib/streams.js'
  import type { Wallet } from '$lib/@types/wallets.js'
  import Msg from '$lib/components/Msg.svelte'
  import BitcoinAmount from '$lib/components/BitcoinAmount.svelte'
  import SummaryRow from '$lib/components/SummaryRow.svelte'
  import CopyValue from '$lib/components/CopyValue.svelte'
  import ExpiryCountdown from '$lib/components/ExpiryCountdown.svelte'
  import WalletSelector from '$lib/components/WalletSelector.svelte'
  import TextInput from '$lib/components/TextInput.svelte'
  import Calculator from '$lib/components/Calculator.svelte'
  import Button from '$lib/components/Button.svelte'
  import { slide } from 'svelte/transition'
  import type { Connection } from '$lib/wallets/interfaces.js'
  import type { AppError } from '$lib/@types/errors.js'
  import { createRandomHex } from '$lib/crypto.js'
  import { db } from '$lib/db/index.js'
  import { goto } from '$app/navigation'
  import ErrorDetail from '$lib/components/ErrorDetail.svelte'
  import { nowSeconds } from '$lib/utils.js'
  import { decodeBolt12 } from '$lib/invoices.js'
  import type { InvoicePayment } from '$lib/@types/payments.js'
  import { base } from '$app/paths'

  export let data: PageData

  let decodeError = ''
  let selectedWalletId: Wallet['id']
  let requesting = false
  let requestingError: AppError | null = null
  let customAmount: number
  let payerNote: string

  const decoded$ = from(decodeBolt12(data.bolt12)).pipe(
    catchError(() => {
      decodeError = $translate('app.errors.invalid_bolt12')
      return of(null)
    })
  )

  const availableWallets$ = combineLatest([decoded$, wallets$, connections$]).pipe(
    filter(([offer]) => !!offer),
    map(([decoded, wallets, connections]) =>
      wallets.filter(({ id, nodeId }) => {
        const connection = connections.find(({ walletId }) => walletId === id)
        const selfPay = nodeId === decoded?.receiverNodeId || nodeId === decoded?.senderNodeId
        return !!connection?.invoices?.pay && !selfPay
      })
    )
  )

  const handleKeyUp = (e: KeyboardEvent) =>
    e.key === 'Enter' && ($decoded$?.amount || customAmount) && useOffer()

  const useOffer = async () => {
    requestingError = null
    requesting = true

    let invoice: InvoicePayment

    try {
      const connection = connections$.value.find(
        ({ walletId }) => walletId === selectedWalletId
      ) as Connection

      // handle pay offer
      if ($decoded$!.type === 'pay') {
        if (!connection.offers?.fetchInvoice || !connection.offers?.payInvoice) {
          throw {
            key: 'connection_unsupported_action',
            detail: {
              context: 'pay offer',
              message: 'Selected connection cannot pay offer.',
              timestamp: nowSeconds()
            }
          }
        }

        const fetchedInvoice = await connection.offers.fetchInvoice({
          offer: data.bolt12,
          amount: customAmount,
          payerNote
        })

        try {
          const decodedFetchedInvoice = await decodeBolt12(fetchedInvoice)

          if (decodedFetchedInvoice.amount !== ($decoded$?.amount || customAmount)) {
            throw {
              key: 'invoice_amount_invalid',
              detail: {
                context: 'pay offer',
                message: 'Fetched invoice amount does not match original or custom amount.',
                timestamp: nowSeconds()
              }
            }
          }
        } catch (error) {
          const { key } = error as AppError

          if (key) {
            throw error
          } else {
            throw {
              key: 'fetched_invoice_invalid',
              detail: {
                context: 'pay offer',
                message: 'Fetched invoice is invalid.',
                timestamp: nowSeconds()
              }
            }
          }
        }

        invoice = await connection.offers.payInvoice(fetchedInvoice)
      } else {
        // handle withdraw offer
        if (!connection.offers?.sendInvoice) {
          throw {
            key: 'connection_unsupported_action',
            detail: {
              context: 'pay offer',
              message: 'Selected connection cannot withdraw from offer.',
              timestamp: nowSeconds()
            }
          }
        }

        invoice = await connection.offers.sendInvoice({
          offer: data.bolt12,
          label: createRandomHex()
        })
      }

      await db.payments.add(invoice)
      await goto(`${base}/payments/${invoice.id}?wallet=${invoice.walletId}`)
    } catch (error) {
      requestingError = error as AppError
    } finally {
      requesting = false
    }
  }
</script>

<svelte:window on:keyup|stopPropagation={handleKeyUp} />

<svelte:head>
  <title>{$translate(`app.routes./offer.title`)}</title>
</svelte:head>

<Section>
  {#if decodeError}
    <Msg type="error" message={decodeError} closable={false} />
  {:else if !$decoded$}
    <Spinner />
  {:else}
    {@const { type, amount, description, receiverNodeId, expiry, issuer } = $decoded$}

    <div class="w-full flex justify-center items-center text-3xl font-semibold">
      <div class="w-8 mr-1.5 -ml-2">{@html lightning}</div>
      <div>
        {$translate(`app.labels.${type}`)}
        {$translate('app.labels.offer')}
      </div>
    </div>

    <div class="w-full mt-4">
      <!-- amount -->
      <SummaryRow>
        <span slot="label">{$translate('app.labels.amount')}:</span>
        <div slot="value">
          {#if amount === 0}
            <div>{$translate('app.labels.any_amount')}</div>
          {:else}
            <BitcoinAmount sats={amount} />
          {/if}
        </div>
      </SummaryRow>

      {#if type === 'pay' && receiverNodeId}
        <SummaryRow>
          <div slot="label">{$translate('app.labels.destination')}:</div>
          <div slot="value"><CopyValue value={receiverNodeId} truncateLength={9} /></div>
        </SummaryRow>
      {/if}

      {#if issuer}
        <SummaryRow>
          <div slot="label">{$translate('app.labels.issuer')}:</div>
          <div slot="value">{issuer}</div>
        </SummaryRow>
      {/if}

      {#if description}
        <SummaryRow>
          <div slot="label">{$translate('app.labels.description')}:</div>
          <div slot="value">{description}</div>
        </SummaryRow>
      {/if}

      {#if expiry}
        <SummaryRow>
          <div slot="label">{$translate('app.labels.expires')}:</div>
          <div slot="value">
            <ExpiryCountdown label={false} {expiry} />
          </div>
        </SummaryRow>
      {/if}

      <div class="mt-6 flex flex-col gap-y-6">
        {#if $availableWallets$}
          <WalletSelector
            autoSelectLast="sent"
            bind:selectedWalletId
            wallets={$availableWallets$}
          />
        {:else}
          <Msg message={$translate('app.errors.offers_unavailable')} type="info" />
        {/if}

        {#if !amount}
          <TextInput
            label={$translate('app.labels.custom_amount')}
            name="amount"
            bind:value={customAmount}
            type="number"
            sats={customAmount}
          />
        {/if}

        {#if type === 'pay'}
          <TextInput
            label={$translate('app.labels.note')}
            name="payerNote"
            bind:value={payerNote}
            type="text"
            hint={$translate('app.labels.optional')}
            placeholder={$translate('app.labels.payer_note_placeholder')}
          />
        {/if}
      </div>

      <div class="w-full flex items-center justify-between mt-6">
        <div class="w-12 -ml-2">
          {#if !amount && $settings$.fiatDenomination !== 'none'}
            <Calculator on:amount={e => (customAmount = e.detail)} />
          {/if}
        </div>
        <div class="w-min">
          <Button
            on:click={useOffer}
            {requesting}
            disabled={(!amount && !customAmount) || !selectedWalletId}
            primary
            text={$translate(`app.labels.${type}`)}
          >
            <div class="w-6 mr-1 -ml-2" slot="iconLeft">{@html lightning}</div>
          </Button>
        </div>
      </div>
    </div>

    {#if requestingError}
      <div in:slide class="mt-4">
        <ErrorDetail error={requestingError} />
      </div>
    {/if}
  {/if}
</Section>
