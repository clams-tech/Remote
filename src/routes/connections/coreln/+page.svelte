<script lang="ts">
  import Steps from '$lib/components/Steps.svelte'
  import Paragraph from '$lib/elements/Paragraph.svelte'
  import SectionHeading from '$lib/elements/SectionHeading.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import keys from '$lib/icons/keys.js'
  import Connect from './Connect.svelte'
  import Rune from './Rune.svelte'

  const translateBase = 'app.routes./connections/coreln'
  const components = [Connect, Rune]
</script>

<Steps {components}>
  <SectionHeading icon={keys} />
  <Paragraph>{$translate(`${translateBase}.introduction`)}</Paragraph>
</Steps>
