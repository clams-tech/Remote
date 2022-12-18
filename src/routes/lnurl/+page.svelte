<script lang="ts">
  import { decodelnurl } from 'js-lnurl'
  import { translate } from '$lib/i18n/translations'
  import Spinner from '$lib/elements/Spinner.svelte'
  import ErrorMsg from '$lib/elements/ErrorMsg.svelte'
  import Auth from './components/auth.svelte'
  import type { PageData } from './$types'

  export let data: PageData

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
</script>

<svelte:head>
  <title>{$translate('app.titles.lnurl')}</title>
</svelte:head>

{#if parsingLnurl}
  <Spinner />
{:else if parseLnurlError}
  <div>
    <!-- Error - parse lnurl error -->
  </div>
{:else if tag === 'login'}
  <Auth {action} {url} {k1} />
{:else}
  <div>
    <!-- Error - tag not recognised -->
  </div>
{/if}
