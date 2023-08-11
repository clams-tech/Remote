<script lang="ts">
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import { translate } from '$lib/i18n/translations.js'

  import type { PageData } from './$types.js'

  export let data: PageData
</script>

<Section>
  <SectionHeading text={$translate('app.labels.keysend')} />
</Section>
