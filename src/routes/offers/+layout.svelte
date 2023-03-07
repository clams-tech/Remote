<script lang="ts">
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
      const offers = await lnApi.listOffers()
      $offers$.data = offers
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
