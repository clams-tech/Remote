<script lang="ts">
  import Spinner from '$lib/elements/Spinner.svelte'
  import { translate } from '$lib/i18n/translations'
  import warning from '$lib/icons/warning'
  import lightning from '$lib/lightning'
  import type { PageData } from './$types'
  import { goto } from '$app/navigation'
  import Slide from '$lib/elements/Slide.svelte'

  import type {
    DecodedBolt12Invoice,
    DecodedBolt12InvoiceRequest,
    DecodedBolt12Offer
  } from '$lib/backends'
  import Summary from '$lib/components/Summary.svelte'
  import { truncateValue } from '$lib/utils'
  import BackButton from '$lib/elements/BackButton.svelte'

  export let data: PageData

  const lnApi = lightning.getLn()

  let loading = true
  let decodeError = ''
  let decoded: DecodedBolt12Offer | DecodedBolt12InvoiceRequest | DecodedBolt12Invoice

  decodeBolt12()

  async function decodeBolt12() {
    try {
      decoded = await lnApi.decode(data.bolt12)
    } catch (error) {
      const { message } = error as { message: string }
      decodeError = message
    } finally {
      loading = false
    }
  }

  $: console.log({ decoded })
</script>

{#if loading}
  <Spinner />
{:else if decodeError || !decoded.valid || !!decoded.offer_recurrence}
  <BackButton on:click={() => goto('/')} text={$translate('app.titles.home')} />
  <section class="w-full p-6 max-w-lg flex items-center justify-center">
    <div class="flex text-utility-error">
      <div class="w-4 mr-2">{@html warning}</div>
      <p>
        {$translate(
          `app.errors.bolt12_${
            decodeError ? 'decode_error' : !decoded.valid ? 'invalid' : 'recurrence_unsupported'
          }`
        )}
      </p>
    </div>
  </section>
{:else}
  {#if decoded.type === 'bolt12 invoice'}
    <!-- <Summary
    type="bolt12"
    destination={decoded.offer_issuer || truncateValue(decoded.offer_node_id)}
    direction="send"
    value={decoded.am}
    /> -->
    <!-- direction={}
    value={}
    description={}
    expiry={}
    timestamp={}
    requesting={} -->
  {/if}
  <!-- offer_id: string
  offer_description: string
  offer_node_id: string
  offer_chains?: GenesisBlockhash[]
  offer_metadata?: string
  offer_currency?: string
  currency_minor_unit?: number
  offer_amount?: string | number
  offer_amount_msat?: string | number
  offer_issuer?: string
  offer_features?: string
  offer_absolute_expiry?: number
  offer_quantity_max?: number -->
  <!-- <Summary
    type="bolt12"
    destination={decoded}
    direction={}
    value={}
    description={}
    expiry={}
    timestamp={}
    requesting={}
    /> -->
{/if}
