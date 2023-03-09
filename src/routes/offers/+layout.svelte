<script lang="ts">
  import type { InvoiceRequestSummary, OfferSummary } from '$lib/backends'
  import { translate } from '$lib/i18n/translations'
  import lightning from '$lib/lightning'
  import { offers$ } from '$lib/streams'

  const lnApi = lightning.getLn()

  if (!$offers$.data && !$offers$.loading) {
    getOffers()
  }

  async function getOffers() {
    $offers$.loading = true

    try {
      const [offers, invoiceRequests] = await Promise.all([
        lnApi.listOffers(),
        lnApi.listInvoiceRequests()
      ])
      // @TODO - Sort by most recently used by looking up offerPayments$[id] and use completedAt date
      $offers$.data = [...offers, ...invoiceRequests].map((offer) => {
        const { offer_id, ...rest } = offer as OfferSummary
        const { invreq_id } = offer as InvoiceRequestSummary
        return { ...rest, id: offer_id || invreq_id, type: offer_id ? 'pay' : 'withdraw' }
      })
    } catch (error) {
      const { code, message } = error as { code: number; message: string }
      $offers$.error =
        code === -32602 ? message : $translate(`app.errors.${code}`, { default: message })
    } finally {
      $offers$.loading = false
    }
  }
</script>

<slot />
