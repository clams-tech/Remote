<script lang="ts">
  import Button from '$lib/elements/Button.svelte'
  import Paragraph from '$lib/elements/Paragraph.svelte'
  import Section from '$lib/elements/Section.svelte'
  import SectionHeading from '$lib/elements/SectionHeading.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import keys from '$lib/icons/keys.js'

  const translateBase = 'app.routes./connections/add'
</script>

<Section>
  <SectionHeading icon={keys} />
  <Paragraph>{$translate(`${translateBase}.introduction`)}</Paragraph>
</Section>
