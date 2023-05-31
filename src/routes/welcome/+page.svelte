<script lang="ts">
  import { translate } from '$lib/i18n/translations'
  import ClamsLogo from '$lib/icons/ClamsLogo.svelte'
  import { fade } from 'svelte/transition'
</script>

<svelte:head>
  <title>{$translate('app.titles./welcome')}</title>
</svelte:head>

<section
  in:fade|local={{ duration: 250 }}
  class="flex flex-col justify-center items-center w-full p-8 max-w-lg bg-neutral-50 dark:bg-neutral-900 rounded"
>
  <div class="w-full flex justify-center mb-8">
    <div class="w-1/2 max-w-4xl">
      <ClamsLogo disableAnimation />
    </div>
  </div>
  <div class="mb-6">
    <h1 class="text-4xl font-bold mb-4">{$translate('app.headings.welcome')}</h1>
    <p class="text-neutral-600 dark:text-neutral-300">{$translate('app.subheadings.welcome')}</p>
  </div>
</section>
