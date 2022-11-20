<script lang="ts">
  import { goto } from '$app/navigation'
  import BackButton from '$lib/elements/BackButton.svelte'
  import Button from '$lib/elements/Button.svelte'
  import Spinner from '$lib/elements/Spinner.svelte'
  import { translate } from '$lib/i18n/translations'
  import alert from '$lib/icons/alert'
  import check from '$lib/icons/check'
  import { firstLetterUpperCase, mainDomain } from '$lib/utils'
  import { decodelnurl } from 'js-lnurl'
  import { fade } from 'svelte/transition'
  import { getAuthSigner } from '../utils'

  export let data: { lnurl: string }

  let parsingLnurl = false
  let parseLnurlError = ''

  let authenticating = false
  let authenticationSuccess = false
  let authenticationError = ''

  let url: URL
  let tag: string
  let k1: string
  let action: string

  getUrlDetails()

  async function getUrlDetails() {
    try {
      const decoded = decodelnurl(data.lnurl)

      url = new URL(decoded)
      tag = url.searchParams.get('tag') || ''

      if (!tag) {
        parsingLnurl = true
        const result = await fetch(url.toString()).then((res) => res.json())
        tag = result.tag
        k1 = result.k1
        action = result.action
        parsingLnurl = false
      } else {
        k1 = url.searchParams.get('k1') || ''
        action = url.searchParams.get('action') || 'login'
      }

      if (!tag || !k1) {
        throw new Error('Invalid lnurl')
      }
    } catch (e) {
      parseLnurlError = (e as { message: string }).message
      parsingLnurl = false
    }
  }

  async function auth() {
    try {
      authenticating = true

      const signer = await getAuthSigner(url.host)
      const signature = signer.sign(k1)
      const loginURL = url

      loginURL.searchParams.set('sig', signature)
      loginURL.searchParams.set('key', signer.publicKey)
      loginURL.searchParams.set('t', Date.now().toString())

      const authResponse = await fetch(loginURL.toString()).then((res) => res.json())

      if (authResponse && authResponse.status === 'OK') {
        authenticationSuccess = true
      } else {
        authenticationError = `Could not ${action} to ${url.host}`
      }
    } catch (error) {
      const { message } = error as { message: string }
      authenticationError = `Could not ${action} to ${url.host}: ${message}`
    } finally {
      authenticating = false
    }
  }
</script>

<svelte:head>
  <title>{$translate('app.titles.lnurl')}</title>
</svelte:head>

<section in:fade class="flex flex-col justify-center items-center h-full w-full max-w-lg">
  <BackButton on:click={() => goto('/scan')} />

  {#if parsingLnurl}
    <Spinner />
  {:else if parseLnurlError}
    <div>{parseLnurlError}</div>
  {:else if tag === 'login'}
    {#if authenticationSuccess}
      <div class="text-utility-success">
        Success! <div class="w-4">{@html check}</div>
      </div>
    {:else if authenticationError}
      <div class="text-utility-error">
        Error: {authenticationError}
        <div class="w-4">{@html alert}</div>
      </div>
    {:else}
      <div>
        <p class="text-lg mb-4">
          {firstLetterUpperCase(action)} to
          <span class="font-semibold">{mainDomain(url.hostname)}</span>?
        </p>
        <Button requesting={authenticating} text={action} on:click={auth} />
      </div>
    {/if}
  {:else}
    <div>
      LNURL tag:{tag} is not currently supported. Request support for this tag in our Discord
    </div>
  {/if}
</section>
