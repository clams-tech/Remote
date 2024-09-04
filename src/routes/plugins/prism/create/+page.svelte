<script lang="ts">
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import { translate } from '$lib/i18n/translations'
  import prismIcon from '$lib/icons/prism'
</script>

<svelte:head>
  <title>{$translate('app.routes./plugins/prism.title')}</title>
</svelte:head>

<Section>
  <div class="flex items-center justify-between gap-x-4">
    <SectionHeading icon={prismIcon} />
  </div>
</Section>
