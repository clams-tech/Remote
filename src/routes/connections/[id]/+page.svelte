<script lang="ts">
  import Button from '$lib/elements/Button.svelte'
  import Paragraph from '$lib/elements/Paragraph.svelte'
  import Section from '$lib/elements/Section.svelte'
  import SectionHeading from '$lib/elements/SectionHeading.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import keys from '$lib/icons/keys.js'
  import type { PageData } from './$types'

  export let data: PageData

  const { info, connection } = data

  /**
   1. Display the details of the connection
   2. Need to make all details editable
   3. Show connection status
   */
</script>

<Section>
  <SectionHeading icon={keys} />
</Section>
