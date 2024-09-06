<script lang="ts">
  import type { PrismMember } from '$lib/@types/plugins'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import TextInput from '$lib/components/TextInput.svelte'
  import Toggle from '$lib/components/Toggle.svelte'
  import { translate } from '$lib/i18n/translations'
  import prismIcon from '$lib/icons/prism'

  let description = ''

  let members: PrismMember[] = [
    {
      description: '',
      destination: '',
      split: 0,
      fees_incurred_by: 'local', // 'local' or 'remote'
      payout_threshold_msat: 0
    },
    {
      description: '',
      destination: '',
      split: 0,
      fees_incurred_by: 'local', // 'local' or 'remote'
      payout_threshold_msat: 0
    }
  ]
</script>

<svelte:head>
  <title>{$translate('app.routes./plugins/prism.title')}</title>
</svelte:head>

<Section>
  <SectionHeading icon={prismIcon} />
  <div class="flex flex-col gap-y-4 w-full mt-2 overflow-scroll p-1">
    <TextInput bind:value={description} name="description" label="Description" type="text" />
    {#each members as { description, destination, split, fees_incurred_by, payout_threshold_msat }, i}
      <h1 class="text-lg font-bold text-center uppercase">Member {i + 1}</h1>
      <TextInput bind:value={description} name="description" label="Description" type="text" />
      <TextInput bind:value={destination} name="destination" label="Destination" type="text" />
      <div class="flex gap-4">
        <TextInput bind:value={split} name="split" label="Split" type="number" />
        <TextInput
          bind:value={payout_threshold_msat}
          name="Payout Threshold"
          label="Payout Threshold (sats)"
          type="number"
        />
      </div>
      <p>Fees incurred by</p>
      <div class="flex gap-4">
        <Toggle>
          <div slot="left" class="mr-2">{'Local'}</div>
        </Toggle>
        <Toggle>
          <div slot="left" class="mr-2">{'Remote'}</div>
        </Toggle>
      </div>
    {/each}
  </div>
</Section>
