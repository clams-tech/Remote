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
  import Big from 'big.js'
  import { formatDateRelativeToNow } from '$lib/dates.js'
  import lightning from '$lib/icons/lightning.js'
  import Button from '$lib/components/Button.svelte'
  import CopyValue from '$lib/components/CopyValue.svelte'
  import Calculator from '$lib/components/Calculator.svelte'
  import Connection from '$lib/components/Connection.svelte'
  import type { ConnectionDetails } from '$lib/@types/connections.js'
  import ConnectionSelector from '$lib/components/ConnectionSelector.svelte'

  export let data: PageData

  let decodeError = ''
  let selectedConnectionId: ConnectionDetails['id']

  const decoded = decodeBolt11(data.invoice) as DecodedBolt11Invoice

  if (!decoded) {
    decodeError = $translate('app.errors.bolt11_decode')
  }

  const customAmountRequired = !decoded.amount || decoded.amount === 'any' || decoded.amount === '0'
  let amountSats = customAmountRequired ? 0 : Big(decoded.amount).div(1000).toNumber()
</script>

<Section>
  {#if customAmountRequired}
    <div class="absolute top-4 right-4 w-12">
      <Calculator on:amount={(e) => (amountSats = e.detail)} />
    </div>
  {/if}

  <div class="w-full flex justify-center items-center text-3xl font-semibold">
    <div class="w-8 mr-1.5">{@html lightning}</div>
    <div>
      {$translate('app.labels.invoice')}
    </div>
  </div>

  {#if decodeError}
    <Msg type="error" message={decodeError} closable={false} />
  {:else}
    {@const { description, expiresAt, nodeId } = decoded}

    <div class="flex items-center w-full justify-center text-2xl">
      <BitcoinAmount
        msat={Big(amountSats || 0)
          .times(1000)
          .toString()}
      />
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
        <div slot="label">{$translate('app.labels.expires')}</div>
        <div slot="value">
          {#await formatDateRelativeToNow(expiresAt) then date}
            {date}
          {/await}
        </div>
      </SummaryRow>

      <div class="mt-6 flex flex-col gap-y-6">
        <ConnectionSelector
          label={$translate('app.labels.pay_from')}
          direction="send"
          bind:selectedConnectionId
        />

        {#if customAmountRequired}
          <TextInput
            label={$translate('app.labels.custom_amount')}
            name="amount"
            bind:value={amountSats}
            type="number"
            msat={Big(amountSats || 0)
              .times(1000)
              .toString()}
          />
        {/if}
      </div>

      <div class="w-full flex items-center justify-end mt-6">
        <div class="w-min">
          <Button disabled={amountSats === 0} primary text={$translate('app.labels.pay')}>
            <div class="w-6 mr-1 -ml-2" slot="iconLeft">{@html lightning}</div>
          </Button>
        </div>
      </div>
    </div>
  {/if}
</Section>
