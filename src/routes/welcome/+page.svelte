<script lang="ts">
  import { translate } from '$lib/i18n/translations'
  import Button from '$lib/elements/Button.svelte'
  import ClamsLogo from '$lib/icons/ClamsLogo.svelte'
  import { fade } from 'svelte/transition'
</script>

<svelte:head>
  <title>{$translate('app.titles.welcome')}</title>
</svelte:head>

<section in:fade class="flex flex-col justify-center items-start w-full p-6 max-w-lg h-full">
  <div class="w-full flex justify-center mb-8">
    <div class="w-1/2 max-w-4xl">
      <ClamsLogo disableAnimation />
    </div>
  </div>
  <div class="mb-6">
    <h1 class="text-4xl font-bold mb-4">{$translate('app.headings.welcome')}</h1>
    <p class="text-neutral-600 dark:text-neutral-300">{$translate('app.subheadings.welcome')}</p>
  </div>

  <a href="/connect" class="w-full">
    <Button text={$translate('app.buttons.go')} primary />
  </a>
</section>
