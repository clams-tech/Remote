<script lang="ts">
  import type { Bolt12Type, InvoiceRequestSummary, OfferSummary } from '$lib/backends'
  import { translate } from '$lib/i18n/translations'
  import lightning from '$lib/lightning'
  import { offers$, offersPayments$ } from '$lib/streams'
  import { formatDecodedOffer, sortPaymentsMostRecent } from '$lib/utils'

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

      const { default: decoder } = await import('bolt12-decoder')

      const offersPayments = $offersPayments$

      $offers$.data = [...offers, ...invoiceRequests]
        .map((offer) => {
          const { offer_id, bolt12, active, single_use, used, label } = offer as OfferSummary
          const { invreq_id } = offer as InvoiceRequestSummary
          const decoded = decoder(bolt12)
          const formatted = formatDecodedOffer({ ...decoded, valid: true, offer_id })

          return {
            ...formatted,
            active,
            single_use,
            used,
            bolt12,
            label,
            id: offer_id || invreq_id,
            type: offer_id ? 'pay' : 'withdraw'
          }
        })
        .sort((a, b) => {
          const aPayments = offersPayments[a.id]
          const bPayments = offersPayments[b.id]
          const aMostRecent = aPayments ? sortPaymentsMostRecent(aPayments)[0].completedAt : null
          const bMostRecent = bPayments ? sortPaymentsMostRecent(bPayments)[0].completedAt : null
          return bMostRecent && aMostRecent
            ? new Date(bMostRecent).getTime() - new Date(aMostRecent).getTime()
            : aMostRecent
            ? -1
            : 1
        })
    } catch (error) {
      const { code, message } = error as { code: number; message: string }
      $offers$.error = $translate(`app.errors.${code}`, { default: message })
    } finally {
      $offers$.loading = false
    }
  }
</script>

<slot />
