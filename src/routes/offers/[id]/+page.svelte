<script lang="ts">
  import { timer } from 'rxjs'
  import { map } from 'rxjs/operators'
  import Spinner from '$lib/elements/Spinner.svelte'
  import { translate } from '$lib/i18n/translations'
  import warning from '$lib/icons/warning'
  import lightning from '$lib/lightning'
  import type { PageData } from './$types'
  import { goto } from '$app/navigation'
  import Slide from '$lib/elements/Slide.svelte'
  import BackButton from '$lib/elements/BackButton.svelte'

  export let data: PageData

  let loading = true
  let loadError = false

  // @TODO lookup offer by data.id in offers array. Could load offers data in offers folder layout file
  // if not found, render offer not found error
  // if not decoded, then decode and add to payload

  const timeSeconds$ = timer(0, 1000).pipe(map(() => Date.now() / 1000))
  // $: offerExpired = !!offerExpiry && offerExpiry <= $timeSeconds$
</script>

<svelte:head>
  <title>
    {$translate('app.titles./offer')}
  </title>
</svelte:head>

{#if loading}
  <Spinner />
{:else if loadError}
  <BackButton on:click={() => goto('/')} text={$translate('app.titles./')} />
  <section class="w-full p-6 max-w-lg flex items-center justify-center">
    <div class="flex text-utility-error">
      <div class="w-4 mr-2">{@html warning}</div>
      <p>
        <!-- @TODO - Render could not find offer error -->
      </p>
    </div>
  </section>
{:else}
  <Slide back={() => goto('/')} backText={$translate('app.titles./')} direction={'left'}>
    <!-- @TODO - Render detail view of offer with action items like disabling etc -->
    <!-- Render a downloadable/copyable QR -->
  </Slide>
{/if}
