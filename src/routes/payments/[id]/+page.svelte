<script lang="ts">
  import Section from '$lib/elements/Section.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import type { PageData } from './$types.js'

  export let data: PageData

  /** payment id could be and invoice.id, transaction.id or an onchain receive address*/
  const { id } = data
</script>

<svelte:head>
  <title>{$translate(`app.routes./payment.title`)}</title>
</svelte:head>

<Section>
  <!-- ds -->
</Section>
