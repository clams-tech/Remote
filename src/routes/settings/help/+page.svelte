<script lang="ts">
  import { goto } from '$app/navigation'
  import { fade } from 'svelte/transition'
  import Slide from '$lib/elements/Slide.svelte'
  import { translate } from '$lib/i18n/translations'
  import SummaryRow from '$lib/elements/SummaryRow.svelte'
  import { DISCORD_LINK, DOCS_LINK, GITHUB_LINK, TWITTER_LINK } from '$lib/constants'
  import clamsIcon from '$lib/icons/clamsIcon'
  import discord from '$lib/icons/discord'
  import github from '$lib/icons/github'
  import twitter from '$lib/icons/twitter'
  import settingsOutline from '$lib/icons/settings-outline'

  let options = [
    {
      label: $translate('app.labels.docs'),
      href: DOCS_LINK,
      icon: clamsIcon
    },
    { label: $translate('app.labels.discord'), href: DISCORD_LINK, icon: discord },
    {
      label: $translate('app.labels.github'),
      href: GITHUB_LINK,
      icon: github
    },
    {
      label: $translate('app.labels.twitter'),
      href: TWITTER_LINK,
      icon: twitter
    }
  ]
</script>

<svelte:head>
  <title>{$translate('app.titles./settings/help')}</title>
</svelte:head>

<Slide
  back={() => {
    goto('/settings')
  }}
  backText={$translate('app.titles./settings')}
>
  <section in:fade class="flex flex-col justify-center w-full p-6 max-w-lg">
    <div class="flex items-center mb-6 mt-12">
      <div class="w-10 mr-2">{@html settingsOutline}</div>
      <h1 class="text-4xl font-bold">
        {$translate('app.titles./settings/help')}
      </h1>
    </div>

    <div class="w-full">
      {#each options as { label, href, icon }}
        <a
          class="flex items-center w-full justify-center"
          {href}
          rel="noopener noreferrer"
          target="_blank"
        >
          <SummaryRow>
            <span slot="label">{label}</span>
            <div slot="value" class="w-8 h-8 flex justify-center items-center">
              {@html icon}
            </div>
          </SummaryRow>
        </a>
      {/each}
    </div>
  </section>
</Slide>
