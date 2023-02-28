<script lang="ts">
  import { goto } from '$app/navigation'
  import { fade } from 'svelte/transition'
  import Slide from '$lib/elements/Slide.svelte'
  import { Language } from '$lib/types'
  import { settings$ } from '$lib/streams'
  import { translate } from '$lib/i18n/translations'
  import SummaryRow from '$lib/elements/SummaryRow.svelte'
  import { SUPPORTED_LOCALES, TRANSLATE_LINK } from '$lib/constants'
  import Button from '$lib/elements/Button.svelte'
  import check from '$lib/icons/check'
  import github from '$lib/icons/github'

  function setLanguage(lang: Language) {
    const currentSettings = settings$.value

    settings$.next({
      ...currentSettings,
      language: lang
    })
  }
</script>

<svelte:head>
  <title>{$translate('app.titles.settings_language')}</title>
</svelte:head>

<Slide
  back={() => {
    goto('/settings/app')
  }}
  backText={$translate('app.titles.settings_app')}
>
  <section in:fade class="flex flex-col items-center justify-center w-full p-6 max-w-lg relative">
    <h1 class="text-lg w-full text-center my-6 font-bold">
      {$translate('app.titles.settings_language')}
    </h1>
    <div class="w-full h-full overflow-y-auto overflow-x-hidden">
      {#each Object.entries(Language) as [locale, lang]}
        {@const disabled = !SUPPORTED_LOCALES.includes(locale)}
        <div
          on:click={() => !disabled && setLanguage(lang)}
          class:opacity-40={disabled}
          class="cursor-pointer"
        >
          <SummaryRow>
            <span slot="label">{lang}</span>

            <div slot="value">
              {#if $settings$.language === lang}
                <div in:fade={{ duration: 250 }} class="w-6">
                  {@html check}
                </div>
              {/if}
            </div>
          </SummaryRow>
        </div>
      {/each}
    </div>

    <div class="absolute flex w-full justify-center bottom-0 p-6">
      <div class="flex flex-col items-center backdrop-blur-md">
        <span class="mb-2">{$translate('app.hints.translate')}</span>
        <a
          href={TRANSLATE_LINK}
          target="_blank"
          rel="noopener noreferrer"
          class="bg-white dark:bg-black"
        >
          <Button text={$translate('app.buttons.github')}>
            <div slot="iconLeft" class="w-8 mr-2">
              {@html github}
            </div>
          </Button>
        </a>
      </div>
    </div>
  </section>
</Slide>
