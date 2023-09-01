<script lang="ts">
  import { translate } from '$lib/i18n/translations'
  import Auth from './components/auth.svelte'
  import Spinner from '$lib/components/Spinner.svelte'
  import { API_URL } from '$lib/constants'
  import type { PageData } from '../$types'
  import { decodeLightningAddress } from '$lib/input-parser.js'
  import Section from '$lib/components/Section.svelte'
  import Msg from '$lib/components/Msg.svelte'
  import SectionHeading from '$lib/components/SectionHeading.svelte'
  import { firstLetterUpperCase } from '$lib/utils.js'
  import Pay from './components/pay.svelte'
  import { msatsToSats } from '$lib/conversion.js'

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
  let minWithdrawable: number // Min amount (in millisatoshis) the user can withdraw from LN SERVICE, or 0
  let maxWithdrawable: number // Max amount (in millisatoshis) the user can withdraw from LN SERVICE, or equal to minWithdrawable if the user has no choice over the amounts
  let metadata: string // Metadata json which must be presented as raw string here, this is required to pass signature verification at a later step
  let commentAllowed: number // length of comment allowed
  let defaultDescription: string // A default withdrawal invoice description
  let lightningAddress: string | null = null

  getUrlDetails()

  async function getUrlDetails() {
    const decodedLightningAddress = decodeLightningAddress(data.lnurl)

    try {
      if (decodedLightningAddress) {
        lightningAddress = data.lnurl
        const { username, domain } = decodedLightningAddress
        url = new URL(`https://${domain}/.well-known/lnurlp/${username}`)
      }
      // bech32 encoded legacy LNURL
      else if (data.lnurl.startsWith('lnurl1')) {
        const { decodelnurl } = await import('js-lnurl/lib/helpers/decodelnurl')
        const decoded = decodelnurl(data.lnurl)
        url = new URL(decoded)
      }
      // modern LNURL format
      else {
        url = new URL(data.lnurl)
      }

      tag = url.searchParams.get('tag') || ''

      if (!tag) {
        parsingLnurl = true

        const result = await fetch(`${API_URL}/http-proxy`, {
          headers: { 'Target-URL': url.toString() }
        }).then((res) => res.json())

        if (result.status === 'ERROR') {
          parseLnurlError = result.reason
          parsingLnurl = false
          return
        }

        tag = result.tag
        k1 = result.k1
        action = result.action
        callback = result.callback
        maxSendable = msatsToSats(result.maxSendable)
        minSendable = msatsToSats(result.minSendable)
        maxWithdrawable = result.maxWithdrawable
        minWithdrawable = result.minWithdrawable
        metadata = result.metadata
        commentAllowed = result.commentAllowed
        defaultDescription = result.defaultDescription
      } else {
        k1 = url.searchParams.get('k1') || ''
        action = url.searchParams.get('action') || 'login'
      }
    } catch (e) {
      parseLnurlError = (e as { message: string }).message
    } finally {
      parsingLnurl = false
    }
  }
</script>

<svelte:head>
  <title>
    {$translate('app.titles./lnurl')}
  </title>
</svelte:head>

<Section>
  <SectionHeading
    text={`${$translate('app.routes./lnurl.title')} ${tag ? `- ${firstLetterUpperCase(tag)}` : ''}`}
  />

  {#if parseLnurlError}
    <Msg message={$translate('app.errors.lnurl_parse_error')} type="error" />
  {:else if parsingLnurl}
    <Spinner />
  {:else if tag}
    {#if tag === 'login'}
      <Auth {url} {k1} />
    {:else if tag === 'payRequest'}
      <Pay
        {url}
        {callback}
        {minSendable}
        {maxSendable}
        {metadata}
        {commentAllowed}
        {lightningAddress}
      />
    {:else if tag === 'withdrawRequest'}
      <!-- <Withdraw {url} {callback} {k1} {minWithdrawable} {maxWithdrawable} {defaultDescription} /> -->
    {:else}
      <Msg message={$translate('app.errors.lnurl_unsupported_tag', { tag })} type="error" />
    {/if}
  {/if}
</Section>