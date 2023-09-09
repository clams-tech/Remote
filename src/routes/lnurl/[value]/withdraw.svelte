<script lang="ts">
  import { API_URL } from '$lib/constants'
  import Button from '$lib/components/Button.svelte'
  import { translate } from '$lib/i18n/translations'
  import { mainDomain } from '$lib/utils'
  import { combineLatest, map } from 'rxjs'
  import { connections$, wallets$ } from '$lib/streams.js'
  import type { Wallet } from '$lib/@types/wallets.js'
  import WalletSelector from '$lib/components/WalletSelector.svelte'
  import { slide } from 'svelte/transition'
  import Msg from '$lib/components/Msg.svelte'
  import TextInput from '$lib/components/TextInput.svelte'
  import { createRandomHex } from '$lib/crypto.js'
  import type { Connection } from '$lib/wallets/interfaces.js'
  import type { Invoice } from '$lib/@types/invoices.js'
  import { db } from '$lib/db.js'
  import type { AppError } from '$lib/@types/errors.js'
  import { goto } from '$app/navigation'

  export let url: URL
  export let k1: string
  export let callback: string // The URL from LN SERVICE which will accept the pay request parameters
  export let minWithdrawable: number // Min amount (in millisatoshis) the user can withdraw from LN SERVICE, or 0
  export let maxWithdrawable: number // Max amount (in millisatoshis) the user can withdraw from LN SERVICE, or equal to minWithdrawable if the user has no choice over the amounts
  export let defaultDescription: string // A default withdrawal invoice description

  const serviceName = mainDomain(url.hostname)
  const fixedAmountWithdrawable = minWithdrawable === maxWithdrawable

  let amount: number = maxWithdrawable
  let amountError = ''
  let selectedWalletId: Wallet['id']

  const availableWallets$ = combineLatest([wallets$, connections$]).pipe(
    map(([wallets, connections]) =>
      wallets.filter(({ id }) => {
        const connection = connections.find(({ walletId }) => walletId === id)
        return !!connection?.invoices?.create
      })
    )
  )

  $: if (typeof amount !== 'undefined') {
    validateAmount()
  }

  function validateAmount() {
    if (amount < minWithdrawable) {
      amountError = $translate('app.errors.min_withdrawable')
      return
    }

    if (amount > maxWithdrawable) {
      amountError = $translate('app.errors.max_withdrawable')
      return
    }

    amountError = ''
  }

  let requesting = false
  let requestError = ''

  async function initiateWithdraw() {
    try {
      requestError = ''
      requesting = true

      const connection = connections$.value.find(
        ({ walletId }) => walletId === selectedWalletId
      ) as Connection

      const id = createRandomHex()

      let invoice: Invoice

      try {
        invoice = await connection.invoices!.create!({
          id,
          amount,
          description: defaultDescription || `${serviceName} LNURL Withdraw`
        })
      } catch (error) {
        const { key } = error as AppError
        throw new Error($translate(`app.errors.${key}`))
      }

      await db.invoices.add(invoice)

      const url = new URL(callback)
      const kind = url.searchParams.get('kind')

      if (kind) {
        url.searchParams.set('kind', 'withdrawRequest')
      }

      url.searchParams.set('k1', k1)
      url.searchParams.set('pr', invoice.request as string)

      const result = await fetch(`${API_URL}/http-proxy`, {
        headers: {
          'Target-URL': url.toString()
        }
      }).then((res) => res.json())

      if (result.status === 'ERROR') {
        throw new Error(result.reason)
      }

      await goto(`/transactions/${invoice.id}`)
    } catch (error) {
      const { message } = error as Error
      requestError = message
    } finally {
      requesting = false
    }
  }
</script>

<div class="flex flex-col gap-y-4">
  <h2 class="uppercase text-xl font-semibold mt-2">{serviceName}</h2>

  <div class="text-sm font-semibold">
    {#if minWithdrawable}
      <div>{$translate('app.labels.min_withdrawable')}: {minWithdrawable}</div>
    {/if}

    {#if maxWithdrawable}
      <div>{$translate('app.labels.max_withdrawable')}: {maxWithdrawable}</div>
    {/if}
  </div>

  <div class="flex flex-col gap-y-4">
    {#if $availableWallets$}
      <WalletSelector
        label={$translate('app.labels.to_wallet')}
        bind:selectedWalletId
        wallets={$availableWallets$}
      />
    {/if}

    <TextInput
      label={$translate('app.labels.amount')}
      bind:value={amount}
      readonly={fixedAmountWithdrawable}
      name="amount"
      type="number"
      invalid={amountError}
      hint={$translate('app.labels.sats')}
    />

    <div class="w-full flex justify-end">
      <div class="w-min">
        <Button
          {requesting}
          disabled={!amount}
          text={$translate('app.labels.withdraw')}
          on:click={initiateWithdraw}
        />
      </div>
    </div>
  </div>

  {#if requestError}
    <div class="mt-4" transition:slide={{ axis: 'y' }}>
      <Msg message={requestError} type="error" />
    </div>
  {/if}
</div>
