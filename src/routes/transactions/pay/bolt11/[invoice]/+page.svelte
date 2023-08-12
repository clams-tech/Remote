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
  import type { ConnectionDetails } from '$lib/@types/connections.js'
  import ConnectionSelector from '$lib/components/ConnectionSelector.svelte'
  import ExpiryCountdown from '$lib/components/ExpiryCountdown.svelte'
  import type { AppError } from '$lib/@types/errors.js'
  import { connections$ } from '$lib/streams.js'
  import type { ConnectionInterface } from '$lib/connections/interfaces.js'
  import { createRandomHex } from '$lib/crypto.js'
  import { msatsToSats, satsToMsats } from '$lib/conversion.js'
  import { db } from '$lib/db.js'
  import { goto } from '$app/navigation'
  import { slide } from 'svelte/transition'

  export let data: PageData

  let decodeError = ''
  let selectedConnectionId: ConnectionDetails['id']
  let paying = false
  let payingError = ''

  const decoded = decodeBolt11(data.invoice) as DecodedBolt11Invoice

  if (!decoded) {
    decodeError = $translate('app.errors.bolt11_decode')
  }

  const customAmountRequired = !decoded.amount || decoded.amount === 'any' || decoded.amount === '0'
  let amountSats = customAmountRequired ? 0 : msatsToSats(decoded.amount)

  const pay = async () => {
    paying = true
    payingError = ''

    try {
      const connection = connections$.value.find(
        ({ connectionId }) => connectionId === selectedConnectionId
      ) as ConnectionInterface

      const paid = await connection.invoices!.pay!({
        request: data.invoice,
        id: createRandomHex(),
        amount: customAmountRequired ? satsToMsats(amountSats) : undefined
      })

      await db.invoices.add(paid)
      await goto(`/transactions/${paid.id}`)
    } catch (error) {
      const { key } = error as AppError
      payingError = $translate(`app.errors.${key}`)
    } finally {
      paying = false
    }
  }

  const handleKeyUp = (e: KeyboardEvent) => e.key === 'Enter' && amountSats !== 0 && pay()
</script>

<svelte:window on:keyup={handleKeyUp} />

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
      <BitcoinAmount msat={satsToMsats(amountSats || 0)} />
    </div>

    <div class="w-full mt-6">
      <SummaryRow>
        <div slot="label">{$translate('app.labels.destination')}:</div>
        <div slot="value"><CopyValue value={nodeId} truncateLength={9} /></div>
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

      <div class="mt-6 flex flex-col gap-y-6">
        <ConnectionSelector direction="send" bind:selectedConnectionId />

        {#if customAmountRequired}
          <TextInput
            label={$translate('app.labels.custom_amount')}
            name="amount"
            bind:value={amountSats}
            type="number"
            msat={satsToMsats(amountSats || 0)}
          />
        {/if}
      </div>

      <div class="w-full flex items-center justify-between mt-6">
        <div class="w-12 -ml-2">
          {#if customAmountRequired}
            <Calculator on:amount={(e) => (amountSats = e.detail)} />
          {/if}
        </div>
        <div class="w-min">
          <Button
            on:click={pay}
            requesting={paying}
            disabled={amountSats === 0}
            primary
            text={$translate('app.labels.pay')}
          >
            <div class="w-6 mr-1 -ml-2" slot="iconLeft">{@html lightning}</div>
          </Button>
        </div>
      </div>
    </div>

    {#if payingError}
      <div in:slide class="mt-4">
        <Msg type="error" message={payingError} />
      </div>
    {/if}
  {/if}
</Section>
