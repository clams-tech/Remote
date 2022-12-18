<script lang="ts">
  import { goto } from '$app/navigation'
  import { LNURL_PROXY } from '$lib/constants'
  import Button from '$lib/elements/Button.svelte'
  import check from '$lib/icons/check'
  import { firstLetterUpperCase, mainDomain } from '$lib/utils'
  import { noop } from 'svelte/internal'
  import { getAuthSigner } from '../utils'

  export let action: string
  export let url: URL
  export let k1: string

  let authenticating = false
  let authenticationSuccess = false
  let authenticationError = ''

  async function auth() {
    try {
      authenticating = true

      const signer = await getAuthSigner(url.host)
      const signature = signer.sign(k1)
      const loginURL = new URL(url.toString())

      loginURL.searchParams.set('sig', signature)
      loginURL.searchParams.set('key', signer.publicKey)
      loginURL.searchParams.set('t', Date.now().toString())

      const authResponse = await fetch(LNURL_PROXY, {
        headers: { 'Target-URL': loginURL.toString() }
      }).then((res) => res.json())

      if (authResponse && authResponse.status === 'OK') {
        authenticationSuccess = true
        setTimeout(() => goto('/'), 2000)
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

<div>
  <p class="text-lg mb-4 p-4">
    {firstLetterUpperCase(action)} to
    <span class="font-semibold">{mainDomain(url.hostname)}</span>?
  </p>

  <div class:text-utility-success={!!authenticationSuccess}>
    <Button
      requesting={authenticating}
      text={authenticationSuccess
        ? `${firstLetterUpperCase(action)} success!`
        : firstLetterUpperCase(action)}
      on:click={authenticating || authenticationSuccess ? noop : auth}
    >
      <div slot="iconRight" class:w-6={authenticationSuccess} class:ml-2={authenticationSuccess}>
        {#if authenticationSuccess}
          {@html check}
        {/if}
      </div>
    </Button>
  </div>
</div>
