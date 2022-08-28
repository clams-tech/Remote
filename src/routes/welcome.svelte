<script lang="ts" context="module">
  import type { Load } from '@sveltejs/kit'

  let loaded = false

  export const load: Load = async () => {
    if (!loaded) {
      loaded = true

      if (credentials$.getValue().connection) {
        return {
          redirect: '/',
          status: 302
        }
      }
    }
  }
</script>

<script lang="ts">
  import { translate } from '$lib/i18n/translations'
  import Button from '$lib/elements/Button.svelte'
  import ClamsLogo from '$lib/icons/ClamsLogo.svelte'
  import { credentials$ } from '$lib/streams'
</script>

<svelte:head>
  <title>{$translate('app.titles.welcome')}</title>
</svelte:head>

<section class="flex flex-col justify-center items-start w-full p-8 max-w-xl h-full">
  <div class="w-full flex justify-center mb-8">
    <div class="w-1/2 max-w-4xl">
      <ClamsLogo />
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
