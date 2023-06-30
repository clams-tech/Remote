<script lang="ts">
  import { goto } from '$app/navigation'
  import Button from '$lib/elements/Button.svelte'
  import Spinner from '$lib/elements/Spinner.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import channels from '$lib/icons/channels.js'
  import plus from '$lib/icons/plus.js'
  import { channels$ } from '$lib/streams.js'
</script>

<svelte:head>
  <title>{$translate('app.titles./channels')}</title>
</svelte:head>

<section class="flex flex-col justify-center items-start w-full p-4 max-w-lg">
  <div class="flex items-center justify-between mb-6 mt-12 w-full">
    <div class="flex items-center">
      <div class="w-10 mr-2">{@html channels}</div>
      <h1 class="text-4xl font-bold">
        {$translate('app.titles./channels')}
      </h1>
    </div>

    <div>
      <Button
        on:click={() => goto('/channels/open')}
        text={$translate('app.buttons.open_channel')}
        primary
      >
        <div slot="iconLeft" class="w-8 mb-[1px]">
          {@html plus}
        </div>
      </Button>
    </div>
  </div>

  <div class="w-full flex justify-center">
    {#if $channels$.loading}
      <Spinner />
    {:else if $channels$.error}
      <!-- @TODO - display error -->
    {:else if $channels$.data}
      {#each $channels$.data as channel}
        <div>
          {JSON.stringify(channel)}
        </div>
      {/each}
    {/if}
  </div>
</section>
