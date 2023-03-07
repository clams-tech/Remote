<script lang="ts">
  import { goto } from '$app/navigation'
  import BackButton from '$lib/elements/BackButton.svelte'
  import Slide from '$lib/elements/Slide.svelte'
  import Spinner from '$lib/elements/Spinner.svelte'
  import { translate } from '$lib/i18n/translations'
  import lightningOutline from '$lib/icons/lightning-outline'
  import warning from '$lib/icons/warning'
  import { offers$ } from '$lib/streams'
  import { truncateValue } from '$lib/utils'
</script>

<svelte:head>
  <title>
    {$translate('app.titles./offers')}
  </title>
</svelte:head>

{#if $offers$.loading}
  <Spinner />
{:else if $offers$.error}
  <BackButton on:click={() => goto('/')} text={$translate('app.titles./')} />
  <section class="w-full p-6 max-w-lg flex items-center justify-center">
    <div class="flex items-center mb-6 mt-12">
      <div class="w-10 mr-2">{@html lightningOutline}</div>
      <h1 class="text-4xl font-bold">
        {$translate('app.titles./offers')}
      </h1>
    </div>
    <div class="flex text-utility-error">
      <div class="w-4 mr-2">{@html warning}</div>
      <p>
        {$translate('app.errors.')}
      </p>
    </div>
  </section>
{:else if $offers$.data}
  <Slide back={() => goto('/')} backText={$translate('app.titles./')} direction="left">
    <section class="flex flex-col justify-center items-start w-full p-6 max-w-lg">
      <div class="flex items-center mb-6 mt-12">
        <div class="w-10 mr-2">{@html lightningOutline}</div>
        <h1 class="text-4xl font-bold">
          {$translate('app.titles./offers')}
        </h1>
      </div>

      <div class="grid gap-4 w-full">
        {#each $offers$.data as { label, offer_id, active, single_use, used, bolt12 }}
          <button
            on:click={() => goto(`/offers/${offer_id}`)}
            class="w-full border rounded-md p-4 cursor-pointer flex flex-col"
          >
            {#if label}
              <div>{label}</div>
            {/if}
            <div>{truncateValue(offer_id)}</div>
            <div>Active: {active}</div>
            <div>Single use: {single_use}</div>
            <div>Used: {used}</div>
            <div>Bolt12: {truncateValue(bolt12)}</div>
          </button>
        {/each}
      </div>
    </section>
  </Slide>
{/if}
