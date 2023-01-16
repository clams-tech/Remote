<script lang="ts">
  import { decodelnurl } from 'js-lnurl'
  import { translate } from '$lib/i18n/translations'
  import Spinner from '$lib/elements/Spinner.svelte'
  import Auth from './components/auth.svelte'
  import type { PageData } from './$types'
  import Pay from './components/pay.svelte'
  import { LNURL_PROXY } from '$lib/constants'
  import warning from '$lib/icons/warning'
  import { decodeLightningAddress } from '$lib/utils'

  export let data: PageData

  let parsingLnurl = false
  let parseLnurlError = ''

  let url: URL
  let tag: string
  let k1: string
  let action: string
  let callback: string // The URL from LN SERVICE which will accept the pay request parameters
  let maxSendable: number // Max millisatoshi amount LN SERVICE is willing to receive
  let minSendable: number // Min millisatoshi amount LN SERVICE is willing to receive, can not be less than 1 or more than `maxSendable`
  let metadata: string // Metadata json which must be presented as raw string here, this is required to pass signature verification at a later step
  let commentAllowed: number // length of comment allowed

  getUrlDetails()

  async function getUrlDetails() {
    try {
      const lightningAddress = decodeLightningAddress(data.lnurl)

      if (lightningAddress) {
        const { username, domain } = lightningAddress
        url = new URL(`https://${domain}/.well-known/lnurlp/${username}`)
      } else {
        const decoded = decodelnurl(data.lnurl)
        url = new URL(decoded)
      }

      tag = url.searchParams.get('tag') || ''

      if (!tag) {
        parsingLnurl = true

        const result = await fetch(LNURL_PROXY, { headers: { 'Target-URL': url.toString() } }).then(
          (res) => res.json()
        )

        if (result.status === 'ERROR') {
          parseLnurlError = result.reason
          parsingLnurl = false
          return
        }

        tag = result.tag
        k1 = result.k1
        action = result.action
        callback = result.callback
        maxSendable = result.maxSendable
        minSendable = result.minSendable
        metadata = result.metadata
        commentAllowed = result.commentAllowed
        parsingLnurl = false
        commentAllowed = result.commentAllowed
      } else {
        k1 = url.searchParams.get('k1') || ''
        action = url.searchParams.get('action') || 'login'
      }
    } catch (e) {
      parseLnurlError = (e as { message: string }).message
      parsingLnurl = false
    }
  }
</script>

<svelte:head>
  <title>
    {$translate('app.titles.lnurl')}
  </title>
</svelte:head>

{#if parsingLnurl}
  <Spinner />
{:else if parseLnurlError}
  <section class="w-full p-6 max-w-lg">
    <div class="flex text-utility-error">
      <div class="w-4 mr-2">{@html warning}</div>
      <p>{$translate('app.errors.lnurl_parse_error')}</p>
    </div>
  </section>
{:else if tag === 'login'}
  <Auth {action} {url} {k1} />
{:else if tag === 'payRequest'}
  <Pay {url} {callback} {maxSendable} {minSendable} {metadata} {commentAllowed} />
{:else}
  <section class="w-full p-6 max-w-lg">
    <div class="flex text-utility-error">
      <div class="w-4 mr-2">{@html warning}</div>
      <p>{$translate('app.errors.lnurl_unsupported_tag', { tag })}</p>
    </div>
  </section>
{/if}
