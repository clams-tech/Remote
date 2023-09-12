<script lang="ts">
  import { API_URL } from '$lib/constants'
  import Button from '$lib/components/Button.svelte'
  import { translate } from '$lib/i18n/translations'
  import { mainDomain, nowSeconds } from '$lib/utils'
  import { satsToMsats } from '$lib/conversion.js'
  import decode from '$lib/bolt11.js'
  import { combineLatest, map } from 'rxjs'
  import { connections$, wallets$ } from '$lib/streams.js'
  import type { Wallet } from '$lib/@types/wallets.js'
  import WalletSelector from '$lib/components/WalletSelector.svelte'
  import { slide } from 'svelte/transition'
  import Msg from '$lib/components/Msg.svelte'
  import TextInput from '$lib/components/TextInput.svelte'
  import { sha256 } from '@noble/hashes/sha256'
  import { bytesToHex } from '@noble/hashes/utils'
  import { createRandomHex } from '$lib/crypto.js'
  import type { Connection } from '$lib/wallets/interfaces.js'
  import type { Invoice } from '$lib/@types/invoices.js'
  import { db } from '$lib/db.js'
  import AES from 'crypto-js/aes'
  import encBase64 from 'crypto-js/enc-base64'
  import encHex from 'crypto-js/enc-hex'
  import encUtf8 from 'crypto-js/enc-utf8'
  import link from '$lib/icons/link.js'
  import CopyValue from '$lib/components/CopyValue.svelte'
  import type { AppError } from '$lib/@types/errors.js'
  import caret from '$lib/icons/caret.js'
  import ErrorDetail from '$lib/components/ErrorDetail.svelte'

  export let url: URL
  export let callback: string // The URL from LN SERVICE which will accept the pay request parameters
  export let maxSendable: number // Max sats amount LN SERVICE is willing to receive
  export let minSendable: number // Min sats amount LN SERVICE is willing to receive, can not be less than 1 or more than `maxSendable`
  export let metadata: string // Metadata json which must be presented as raw string here, this is required to pass signature verification at a later step
  export let commentAllowed: number // indicates the length of comment (description) allowed
  export let lightningAddress: string | null

  const serviceName = lightningAddress || mainDomain(url.hostname)

  let meta: string[][]
  let shortDescription: string
  let longDescription: string | undefined
  let image: string | undefined
  let mime: string | undefined
  let address: string | undefined
  let amount: number
  let amountError = ''
  let comment = ''

  let selectedWalletId: Wallet['id']

  const availableWallets$ = combineLatest([wallets$, connections$]).pipe(
    map(([wallets, connections]) =>
      wallets.filter(({ id }) => {
        const connection = connections.find(({ walletId }) => walletId === id)
        return !!connection?.invoices?.pay
      })
    )
  )

  type FormattedMetadata = {
    /**required short description of pay request*/
    shortDescription: string
    /**additional long description*/
    longDescription?: string
    /**base64 image string*/
    image?: string
    /**the image data type*/
    mime?: string
    /**the lightning address*/
    address?: string
  }

  function formatMetadata(meta: string[][]) {
    return meta.reduce((acc, [mime, data], index) => {
      if (index === 0) {
        acc.shortDescription = data
      }

      if (mime.includes('long-desc')) {
        acc.longDescription = data
      }

      if (mime.includes('image')) {
        acc.image = data
        acc.mime = mime
      }

      if (mime.includes('email') || mime.includes('identifier')) {
        acc.address = data
      }

      return acc
    }, {} as FormattedMetadata)
  }

  try {
    meta = JSON.parse(metadata)
    const formattedMetadata = formatMetadata(meta)

    shortDescription = formattedMetadata.shortDescription
    longDescription = formattedMetadata.longDescription
    image = formattedMetadata.image
    mime = formattedMetadata.mime
    address = formattedMetadata.address
  } catch (error) {
    // just don't show invalid metadata
  }

  $: if (typeof amount !== 'undefined') {
    validateAmount()
  }

  function validateAmount() {
    if (amount < minSendable) {
      amountError = $translate('app.errors.min_sendable')
      return
    }

    if (amount > maxSendable) {
      amountError = $translate('app.errors.max_sendable')
      return
    }

    amountError = ''
  }

  let requesting = false
  let requestError: AppError | null = null

  type SuccessMessage = { tag: 'message'; message: string }
  type SuccessUrl = { tag: 'url'; description: string; url: string }
  type SuccessAES = { tag: 'aes'; description: string; ciphertext: string; iv: string }
  type SuccessAction = SuccessMessage | SuccessUrl | SuccessAES

  let paidInvoice: Invoice
  let success: SuccessAction
  let decryptedAes: string

  async function initiatePay() {
    try {
      requestError = null
      requesting = true

      const amountMsats = satsToMsats(amount)
      const url = new URL(callback)
      const kind = url.searchParams.get('kind')

      if (kind) {
        url.searchParams.set('kind', 'payRequest')
      }

      url.searchParams.set('amount', amountMsats)

      if (comment) {
        url.searchParams.set('comment', comment)
      }

      const result = await fetch(`${API_URL}/http-proxy`, {
        headers: {
          'Target-URL': url.toString()
        }
      }).then((res) => res.json())

      if (result.status === 'ERROR') {
        throw {
          key: 'lnurl_pay_error',
          detail: {
            timestamp: nowSeconds(),
            message: result.reason,
            context: 'LNURL Pay request invoice'
          }
        }
      }

      const { pr: paymentRequest, successAction } = result

      success = successAction
      const decoded = decode(paymentRequest)

      if (!decoded) {
        throw {
          key: 'invalid_bolt11',
          detail: {
            timestamp: nowSeconds(),
            message: 'Invoice returned from server is not a valid BOLT11',
            context: 'LNURL Pay request invoice'
          }
        }
      }

      const { amount: paymentRequestAmount } = decoded

      if (paymentRequestAmount !== amount) {
        throw {
          key: 'lnurl_pay_amount',
          detail: {
            timestamp: nowSeconds(),
            message: 'Invoice returned from server does not have the correct amount',
            context: 'LNURL Pay request invoice'
          }
        }
      }

      const connection = connections$.value.find(
        ({ walletId }) => walletId === selectedWalletId
      ) as Connection

      const id = createRandomHex()

      paidInvoice = await connection.invoices!.pay!({
        id,
        request: paymentRequest,
        description: metadata
      })

      await db.invoices.add(paidInvoice)

      if (successAction?.tag === 'aes') {
        decryptedAes = AES.decrypt(successAction.ciphertext, encHex.parse(paidInvoice.preimage!), {
          iv: encBase64.parse(successAction.iv)
        }).toString(encUtf8)
      }
    } catch (error) {
      requestError = error as AppError
    } finally {
      requesting = false
    }
  }
</script>

<div class="flex flex-col gap-y-4">
  <h2 class="uppercase text-xl font-semibold mt-2">{serviceName}</h2>

  <div class="text-sm font-semibold">
    {#if minSendable}
      <div>{$translate('app.labels.min_sendable')}: {minSendable}</div>
    {/if}

    {#if maxSendable}
      <div>{$translate('app.labels.max_sendable')}: {maxSendable}</div>
    {/if}
  </div>

  {#if !paidInvoice}
    <div out:slide={{ axis: 'y' }}>
      {#if $availableWallets$}
        <div class="mb-4">
          <WalletSelector
            label={$translate('app.labels.from_wallet')}
            bind:selectedWalletId
            wallets={$availableWallets$}
          />
        </div>
      {/if}

      <div class="mb-4">
        <TextInput
          label={$translate('app.labels.amount')}
          bind:value={amount}
          name="amount"
          type="number"
          invalid={amountError}
          hint={$translate('app.labels.sats')}
        />
      </div>

      {#if commentAllowed}
        <div class="mb-4">
          <TextInput
            bind:value={comment}
            label={$translate('app.labels.comment')}
            name="comment"
            type="text"
            maxlength={commentAllowed}
            hint={$translate('app.labels.optional')}
          />
        </div>
      {/if}

      <div class="w-full flex justify-end">
        <div class="w-min">
          <Button
            {requesting}
            disabled={!amount}
            text={$translate('app.labels.pay')}
            on:click={initiatePay}
          />
        </div>
      </div>
    </div>
  {:else}
    <div class="flex flex-col gap-y-4" in:slide={{ axis: 'y' }}>
      <div>
        <Msg type="info" message={$translate('app.labels.lnurl_pay_success')} />
      </div>

      <a href={`/transactions/${paidInvoice.id}`} class="flex items-center"
        >{$translate('app.labels.goto_payment')}
        <div class="w-4 -rotate-90">{@html caret}</div>
      </a>

      {#if success}
        <p class="max-w-full">
          {#if success.tag === 'message'}
            {success.message}
          {:else}
            {success.description}
          {/if}
        </p>

        {#if success.tag === 'url'}
          <div class="w-full flex items-center flex-wrap mb-6 gap-4">
            <p class="max-w-full text-neutral-400 italic break-words">
              {success.url}
            </p>

            <a href={success.url} target="_blank" rel="noopener noreferrer">
              <Button text={$translate('app.buttons.open')}>
                <div class="w-5 -ml-2 mr-1" slot="iconLeft">{@html link}</div>
              </Button>
            </a>
          </div>
        {/if}

        {#if success.tag === 'aes'}
          <div class="w-full">
            <p>{success.description}</p>
            <CopyValue value={decryptedAes} />
          </div>
        {/if}
      {/if}
    </div>
  {/if}

  {#if requestError}
    <div class="mt-4" transition:slide={{ axis: 'y' }}>
      <ErrorDetail error={requestError} />
    </div>
  {/if}
</div>
