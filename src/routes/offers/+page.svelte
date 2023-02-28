<script lang="ts">
  import type {
    DecodedBolt12Invoice,
    DecodedBolt12InvoiceRequest,
    DecodedBolt12Offer
  } from '$lib/backends'
  import Spinner from '$lib/elements/Spinner.svelte'
  import { translate } from '$lib/i18n/translations'
  import warning from '$lib/icons/warning'
  import lightning from '$lib/lightning'
  import type { PageData } from './$types'

  export let data: PageData

  const lnApi = lightning.getLn()

  let loading = true
  let decodeError = ''
  let decoded: DecodedBolt12Offer | DecodedBolt12InvoiceRequest | DecodedBolt12Invoice

  decodeBolt12()

  async function decodeBolt12() {
    try {
      decoded = await lnApi.decode(data.bolt12)

      if (decoded.type === 'bolt12 offer') {
        // fetch invoice
        // set bolt12 invoice
      } else if (decoded.type === 'bolt12 invoice') {
        // set bolt12 invoice
      } else if (decoded.type === 'bolt12 invoice_request') {
        // create an invoice
      }
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
{:else if decodeError || !decoded.valid}
  <section class="w-full p-6 max-w-lg flex items-center justify-center">
    <div class="flex text-utility-error">
      <div class="w-4 mr-2">{@html warning}</div>
      <p>{$translate(`app.errors.bolt12_${decodeError ? 'decode_error' : 'invalid'}`)}</p>
    </div>
  </section>
{:else}
  <!-- Decoded -->
{/if}
