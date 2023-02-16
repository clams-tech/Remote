<script lang="ts">
  import { translate } from '$lib/i18n/translations'
  import Auth from './components/auth.svelte'
  import Pay from './components/pay.svelte'
  import Withdraw from './components/withdraw.svelte'
  import warning from '$lib/icons/warning'
  import Spinner from '$lib/elements/Spinner.svelte'
  import { LNURL_PROXY } from '$lib/constants'
  import { decodeLightningAddress } from '$lib/utils'
  import type { PageData } from './$types'

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

  getUrlDetails()

  async function getUrlDetails() {
    try {
      const lightningAddress = decodeLightningAddress(data.lnurl)

      if (lightningAddress) {
        const { username, domain } = lightningAddress
        url = new URL(`https://${domain}/.well-known/lnurlp/${username}`)
      }
      // bech32 encoded legacy LNURL
      else if (data.lnurl.startsWith('lnurl1')) {
        const { decodelnurl } = await import('js-lnurl')
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
    {$translate('app.titles.lnurl')}
  </title>
</svelte:head>

{#if parsingLnurl}
  <Spinner />
{:else if parseLnurlError}
  <section class="w-full p-6 max-w-lg flex items-center justify-center">
    <div class="flex text-utility-error">
      <div class="w-4 mr-2">{@html warning}</div>
      <p>{$translate('app.errors.lnurl_parse_error')}</p>
    </div>
  </section>
{:else if tag === 'login'}
  <Auth {action} {url} {k1} />
{:else if tag === 'payRequest'}
  <Pay {url} {callback} {minSendable} {maxSendable} {metadata} {commentAllowed} />
{:else if tag === 'withdrawRequest'}
  <Withdraw {url} {callback} {k1} {minWithdrawable} {maxWithdrawable} {defaultDescription} />
{:else}
  <section class="w-full p-6 max-w-lg">
    <div class="flex text-utility-error">
      <div class="w-4 mr-2">{@html warning}</div>
      <p>{$translate('app.errors.lnurl_unsupported_tag', { tag })}</p>
    </div>
  </section>
{/if}
