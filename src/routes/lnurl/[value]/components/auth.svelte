<script lang="ts">
  import { API_URL } from '$lib/constants'
  import Button from '$lib/components/Button.svelte'
  import { mainDomain } from '$lib/utils'
  import { CANONICAL_PHRASE, getAuthSigner } from '../../utils'
  import type { Wallet } from '$lib/@types/wallets.js'
  import { connections$, wallets$ } from '$lib/streams.js'
  import type { Connection } from '$lib/wallets/interfaces.js'
  import Msg from '$lib/components/Msg.svelte'
  import { translate } from '$lib/i18n/translations.js'
  import WalletSelector from '$lib/components/WalletSelector.svelte'
  import { combineLatest, map } from 'rxjs'
  import { slide } from 'svelte/transition'

  export let url: URL
  export let k1: string

  let authenticating = false
  let authenticationSuccess = false
  let authenticationError = ''

  let selectedWalletId: Wallet['id']

  const availableWallets$ = combineLatest([wallets$, connections$]).pipe(
    map(([wallets, connections]) =>
      wallets.filter(({ id }) => {
        const connection = connections.find(({ walletId }) => walletId === id)
        return !!connection?.signatures?.signMessage
      })
    )
  )

  async function auth() {
    try {
      authenticating = true

      const connection = connections$.value.find(
        ({ walletId }) => walletId === selectedWalletId
      ) as Connection

      const signedMessage = await connection.signatures!.signMessage!(CANONICAL_PHRASE)
      const signer = await getAuthSigner(url.host, signedMessage)
      const signature = signer.sign(k1)
      const loginURL = new URL(url.toString())

      loginURL.searchParams.set('sig', signature)
      loginURL.searchParams.set('key', signer.publicKey)
      loginURL.searchParams.set('t', Date.now().toString())

      // const authResponse = await fetch(`${API_URL}/http-proxy`, {
      //   headers: { 'Target-URL': loginURL.toString() }
      // }).then((res) => res.json())

      // uncomment when testing LNURL locally
      const authResponse = await fetch(loginURL.toString()).then((res) => res.json())

      if (authResponse && authResponse.status === 'OK') {
        authenticationSuccess = true
      } else {
        authenticationError = $translate('app.errors.lnurl_auth')
      }
    } catch (error) {
      authenticationError = $translate('app.errors.lnurl_auth')
    } finally {
      authenticating = false
    }
  }
</script>

<div>
  <h2 class="uppercase text-xl font-semibold mt-2 mb-4">{mainDomain(url.hostname)}</h2>

  {#if $availableWallets$}
    <div class="mb-4">
      <WalletSelector bind:selectedWalletId wallets={$availableWallets$} />
    </div>
  {/if}

  {#if authenticationSuccess}
    <div transition:slide={{ axis: 'y' }}>
      <Msg message={$translate('app.labels.lnurl_auth_success')} type="info" />
    </div>
  {:else}
    <div class="w-full flex justify-end">
      <div transition:slide={{ axis: 'y' }} class="w-min">
        <Button
          on:click={auth}
          disabled={!selectedWalletId}
          requesting={authenticating}
          text={`${$translate('app.labels.login')}`}
        />
      </div>
    </div>
  {/if}

  {#if authenticationError}
    <div class="mt-4" transition:slide={{ axis: 'y' }}>
      <Msg message={authenticationError} type="error" />
    </div>
  {/if}
</div>
