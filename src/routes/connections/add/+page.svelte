<script lang="ts">
  import { connections } from '$lib/connections/index.js'
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

  <div
    class="grid justify-center 2xl:max-w-2xl grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-xl overflow-auto mt-6"
  >
    {#each connections as { icon, route }}
      <a
        href={route}
        class="aspect-square no-underline border border-neutral-300 dark:border-neutral-600 rounded flex flex-col justify-center items-center dark:hover:bg-neutral-800/90 hover:bg-neutral-100/90 bg-neutral-50 dark:bg-neutral-900 transition-all"
      >
        <div class="w-full">
          {#await icon() then svg}
            {@html svg}
          {/await}
        </div>
      </a>
    {/each}
  </div>
</Section>
