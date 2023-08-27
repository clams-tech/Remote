<script lang="ts">
  import Button from '$lib/components/Button.svelte'
  import Wallet from '$lib/components/Wallet.svelte'
  import Paragraph from '$lib/components/Paragraph.svelte'
  import Section from '$lib/components/Section.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import Spinner from '$lib/components/Spinner.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import keys from '$lib/icons/keys.js'
  import plus from '$lib/icons/plus.js'
  import { wallets$ } from '$lib/streams.js'

  const translateBase = 'app.routes./wallets'
</script>

<Section>
  <div class="h-full flex flex-col">
    <SectionHeading icon={keys} />

    <!-- NO WALLETS YET -->
    {#if !$wallets$}
      <Spinner />
    {:else if !$wallets$.length}
      <Paragraph>
        {@html $translate(`${translateBase}.introduction`)}
      </Paragraph>
    {:else}
      <div class="w-full overflow-hidden mt-4">
        <div class="flex flex-wrap gap-2 w-full flex-grow overflow-auto">
          {#each $wallets$ as wallet}
            <a href={`/wallets/${wallet.id}`} class="no-underline">
              <Wallet data={wallet} />
            </a>
          {/each}
        </div>
      </div>
    {/if}

    <div class="flex w-full justify-end">
      <a href="/wallets/add" class="mt-6 no-underline block w-min">
        <Button primary text={$translate(`${translateBase}.add_wallet`)}
          ><div class="w-6 mr-1 -ml-2" slot="iconLeft">{@html plus}</div></Button
        >
      </a>
    </div>
  </div>
</Section>
