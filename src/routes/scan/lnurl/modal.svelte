<script lang="ts">
  import { decodelnurl } from 'js-lnurl'
  import { LNURL_PROXY } from '$lib/constants'
  import Button from '$lib/elements/Button.svelte'
  import Spinner from '$lib/elements/Spinner.svelte'
  import check from '$lib/icons/check'
  import { firstLetterUpperCase, mainDomain, noop } from '$lib/utils'
  import { getAuthSigner } from './utils'
  import Modal from '$lib/elements/Modal.svelte'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'

  export let lnurl: string
  export let close: () => void

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
      const decoded = decodelnurl(lnurl)

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
      const loginURL = new URL(url.toString())

      loginURL.searchParams.set('sig', signature)
      loginURL.searchParams.set('key', signer.publicKey)
      loginURL.searchParams.set('t', Date.now().toString())

      const authResponse = await fetch(LNURL_PROXY, {
        headers: { 'Target-URL': loginURL.toString() }
      }).then((res) => res.json())

      if (authResponse && authResponse.status === 'OK') {
        authenticationSuccess = true
        setTimeout(close, 2000)
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

<Modal on:close={close}>
  {#if parsingLnurl}
    <Spinner />
  {:else if parseLnurlError}
    <ErrorMsg bind:message={parseLnurlError} closable={false} />
  {:else if tag === 'login'}
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
          <div
            slot="iconRight"
            class:w-6={authenticationSuccess}
            class:ml-2={authenticationSuccess}
          >
            {#if authenticationSuccess}
              {@html check}
            {/if}
          </div>
        </Button>
      </div>
    </div>
  {:else}
    <ErrorMsg
      message={`LNURL tag: ${tag} is not currently supported. Request support for this tag in our Discord`}
    />
  {/if}
</Modal>
