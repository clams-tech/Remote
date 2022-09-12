<script lang="ts">
  import { goto } from '$app/navigation'
  import { fade } from 'svelte/transition'
  import Slide from '$lib/elements/Slide.svelte'
  import Discord from '$lib/icons/Discord.svelte'
  import Twitter from '$lib/icons/Twitter.svelte'
  import { translate } from '$lib/i18n/translations'
  import SummaryRow from '$lib/elements/SummaryRow.svelte'
  import ClamsIcon from '$lib/icons/ClamsIcon.svelte'
  import Github from '$lib/icons/Github.svelte'
  import { DISCORD_LINK, DOCS_LINK, GITHUB_LINK, TWITTER_LINK } from '$lib/constants'

  let options = [
    {
      label: $translate('app.labels.docs'),
      href: DOCS_LINK,
      icon: ClamsIcon
    },
    { label: $translate('app.labels.discord'), href: DISCORD_LINK, icon: Discord },
    {
      label: $translate('app.labels.github'),
      href: GITHUB_LINK,
      icon: Github
    },
    {
      label: $translate('app.labels.twitter'),
      href: TWITTER_LINK,
      icon: Twitter
    }
  ]
</script>

<svelte:head>
  <title>{$translate('app.titles.settings_help')}</title>
</svelte:head>

<Slide
  back={() => {
    goto('/settings')
  }}
>
  <section in:fade class="flex flex-col items-center justify-center w-full p-6 max-w-xl">
    <h1 class="text-lg w-full text-center mt-2 mb-6 font-bold">
      {$translate('app.titles.settings_help')}
    </h1>
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
            <div slot="value" class="w-10 h-10 flex justify-center items-center">
              <svelte:component this={icon} />
            </div>
          </SummaryRow>
        </a>
      {/each}
    </div>
  </section>
</Slide>
