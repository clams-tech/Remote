<script lang="ts">
  import Msg from '$lib/components/Msg.svelte'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import { translate } from '$lib/i18n/translations'
  import terminal from '$lib/icons/terminal'
  import { connections$ } from '$lib/streams.js'

  $: {
    console.log('connections = ', connections$.value[0].clboss)
    connections$.value[0].clboss?.get()
  }
</script>

<svelte:head>
  <title>{$translate('app.routes./plugins.title')}</title>
</svelte:head>

<Section>
  <div class="flex items-center justify-between gap-x-4">
    <SectionHeading icon={terminal} />
  </div>

  <!--
  TODO
  - Check if node is installed and if so render link to the UI
  - if its not installed render the Msg component below
  -->
  <div class="w-full flex items-center mt-4">
    <div class="flex flex-col gap-4">
      <h1>CLBOSS</h1>

      <Msg
        type="info"
        message="Clboss is not installed on your node. Learn how to install <a class='ml-1' target='_blank' rel='noopener noreferrer' href='https://github.com/ZmnSCPxj/clboss'>here</a>."
      />
    </div>
  </div>
</Section>
