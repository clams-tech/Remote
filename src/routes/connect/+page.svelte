<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { fade } from 'svelte/transition'
  import { decode, type DecodedRune } from 'rune-decoder'
  import { goto } from '$app/navigation'
  import { translate } from '$lib/i18n/translations'
  import TextInput from '$lib/elements/TextInput.svelte'
  import Button from '$lib/elements/Button.svelte'
  import { settings$, updateAuth } from '$lib/streams'
  import Slide from '$lib/elements/Slide.svelte'
  import SummaryRow from '$lib/elements/SummaryRow.svelte'
  import Modal from '$lib/elements/Modal.svelte'
  import ConnectionSettings from '$lib/components/ConnectionSettings.svelte'
  import lightning from '$lib/lightning'
  import { DOCS_CONNECT_LINK, DOCS_RUNE_LINK } from '$lib/constants'
  import info from '$lib/icons/info'
  import check from '$lib/icons/check'
  import close from '$lib/icons/close'
  import copy from '$lib/icons/copy'
  import arrow from '$lib/icons/arrow'
  import warning from '$lib/icons/warning'
  import caret from '$lib/icons/caret'

  import {
    formatDate,
    parseNodeAddress,
    truncateValue,
    validateParsedNodeAddress,
    writeClipboardValue
  } from '$lib/utils'

  type ConnectStatus = 'idle' | 'connecting' | 'success' | 'fail'
  type Step = 'connect' | 'token'

  let focusConnectionInput: () => void
  let focusRuneInput: () => void
  let blurRuneInput: () => void

  onMount(async () => {
    // wait for animation to complete to focus
    setTimeout(focusConnectionInput, 500)
  })

  let step: Step = 'connect'
  let address = ''
  let validAddress = false
  let connectStatus: ConnectStatus = 'idle'
  let sessionPublicKey: string
  let sessionPrivateKey: string
  let copySuccess = ''
  let copyAnimationTimeout: NodeJS.Timeout
  let showDecodedRuneModal = false
  const recipes = ['readonly', 'payments', 'admin'] as const

  type Recipe = typeof recipes[number]

  $: if (address) {
    try {
      validAddress = validateParsedNodeAddress(parseNodeAddress(address))
    } catch {
      validAddress = false
    }
  }

  let token = ''
  let decodedRune: DecodedRune | null = null

  $: if (token) {
    decodedRune = decode(token)

    if (decodedRune) {
      blurRuneInput()
    }
  }

  async function attemptConnect() {
    saveConnectionSettings()
    connectStatus = 'connecting'

    try {
      const lnApi = lightning.getLn({
        address,
        token: ''
      })

      const connected = await lnApi.connection.connect(false)

      connectStatus = connected ? 'success' : 'fail'

      if (connectStatus === 'success') {
        sessionPublicKey = lnApi.connection.publicKey
        sessionPrivateKey = lnApi.connection.privateKey
        step = 'token'

        setTimeout(() => {
          focusRuneInput()
        }, 500)
      }
    } catch (error) {
      connectStatus = 'fail'
    }
  }

  async function saveRune() {
    // set auth details
    updateAuth({
      token,
      address,
      sessionSecret: sessionPrivateKey
    })

    // update token to proper one
    const lnApi = lightning.getLn()
    lnApi.setToken(token)

    lightning.initialiseData()
    goto('/')
  }

  function handleCopy(key: string, value?: string) {
    return async () => {
      const success = await writeClipboardValue(value || key)

      if (success) {
        copySuccess = key

        copyAnimationTimeout = setTimeout(() => (copySuccess = ''), 3000)
      }
    }
  }

  onDestroy(() => {
    copyAnimationTimeout && clearTimeout(copyAnimationTimeout)
  })

  let connectButton: Button
  let saveRuneButton: Button

  function handleKeyPress(ev: KeyboardEvent) {
    if (ev.key === 'Enter') {
      if (step === 'connect' && connectStatus !== 'connecting') {
        validAddress && connectButton.click()
        return
      }

      if (step === 'token') {
        decodedRune && saveRuneButton.click()
        return
      }
    }
  }

  function resetConnectStatus() {
    connectStatus = 'idle'
  }

  function createRuneRecipe(type: Recipe, pubkey: string) {
    switch (type) {
      case 'readonly':
        return `lightning-cli commando-rune restrictions='[["id=${pubkey}"], ["method^list","method^get","method=summary","method=waitanyinvoice","method=waitinvoice"],["method/listdatastore"], ["rate=60"]]'`
      case 'payments':
        return `lightning-cli commando-rune restrictions='[["id=${pubkey}"], ["method^list","method^get","method=summary","method=pay","method=keysend","method=invoice","method=waitanyinvoice","method=waitinvoice", "method=signmessage"],["method/listdatastore"], ["rate=60"]]'`
      case 'admin':
        return `lightning-cli commando-rune restrictions='[["id=${pubkey}"], ["rate=60"]]'`
    }
  }

  $: formattedRestrictions = decodedRune
    ? Promise.all(
        decodedRune.restrictions.map(async ({ summary }) => {
          const alternatives = summary.split(' OR ')
          const formattedAlternatives = await Promise.all(
            alternatives.map(async (alternative) => {
              let words = alternative.split(' ')
              const lastIndex = words.length - 1
              const lastValue = words[lastIndex]

              // format rate limit
              if (words[0] === 'rate') {
                words = ['rate', 'limited', 'to', `${lastValue} requests per minute`]
              }

              // format id
              if (words[0] === 'id') {
                words[lastIndex] = truncateValue(lastValue)
              }

              // format time
              if (words[0] === 'time') {
                const timeMs = parseInt(lastValue) * 1000

                words = [
                  'valid',
                  'until',
                  await formatDate({
                    date: new Date(timeMs).toISOString(),
                    language: $settings$.language
                  })
                ]
              }

              words = words.map((word, i) => {
                // first or last word
                if (i === 0 || i === words.length - 1) {
                  word = `<b>${word}</b>`
                }

                return word
              })

              return words.join(' ')
            })
          )

          return formattedAlternatives.join('<span class="text-xs mr-2"><i><br>OR<br></i></span>')
        })
      )
    : Promise.resolve([])

  let saveConnectionSettings: ConnectionSettings['save']
  let expandConnectionSettings = false
  let invalidConnectionOptions = false
</script>

<svelte:head>
  <title>{$translate('app.titles.connect')}</title>
</svelte:head>

<svelte:window on:keydown={handleKeyPress} />

{#if step === 'connect'}
  <Slide>
    <section class="w-full p-6 max-w-lg m-auto">
      <div class="mb-6">
        <h1 class="text-4xl font-bold mb-4">{$translate('app.headings.connect')}</h1>
        <p class="text-neutral-600 dark:text-neutral-300">
          {$translate('app.subheadings.connect')}
        </p>
      </div>

      <div class="flex items-center mb-6 font-thin text-sm dark:text-purple-200 text-purple-700">
        <div class="w-5 mr-2 border-2 rounded-full border-current">
          {@html info}
        </div>
        <a
          href={DOCS_CONNECT_LINK}
          target="_blank"
          class="hover:underline"
          rel="noopener noreferrer">{$translate('app.hints.help')}</a
        >
      </div>

      <div class="w-full">
        <div class="relative w-full flex flex-col">
          <TextInput
            name="address"
            type="textarea"
            rows={6}
            label={$translate('app.inputs.node_connect.label')}
            invalid={address && !validAddress ? $translate('app.inputs.node_connect.invalid') : ''}
            placeholder={$translate('app.inputs.node_connect.placeholder')}
            bind:value={address}
            bind:focus={focusConnectionInput}
            on:focus={resetConnectStatus}
          />

          <div in:fade class="flex items-center text-sm absolute bottom-1 right-1">
            {#if connectStatus === 'success'}
              <div class="flex items-center">
                <span class="text-utility-success">{$translate('app.inputs.add_rune.success')}</span
                >
                <div class="w-6 text-utility-success">
                  {@html check}
                </div>
              </div>
            {:else if connectStatus === 'fail'}
              <div class="flex items-center">
                <span class="text-utility-error">{$translate('app.errors.node_connect')}</span>
                <div class="w-6 text-utility-error">
                  {@html close}
                </div>
              </div>
            {/if}
          </div>
        </div>

        <button
          on:click={() => (expandConnectionSettings = !expandConnectionSettings)}
          class="mt-4 flex items-center text-sm cursor-pointer"
        >
          <div class:-rotate-90={!expandConnectionSettings} class="w-3 mr-1 transition-transform">
            {@html caret}
          </div>
          <span class="font-semibold underline">Advanced</span>
        </button>

        <!-- ADVANCED SETTINGS -->
        <div
          in:fade
          class:h-28={!!expandConnectionSettings}
          class="text-sm mt-2 pl-4 pr-[1px] flex flex-col items-start overflow-y-hidden h-0 transition-all"
        >
          <ConnectionSettings
            bind:invalid={invalidConnectionOptions}
            bind:save={saveConnectionSettings}
          />
        </div>

        <div class="w-full mt-6">
          <Button
            bind:this={connectButton}
            disabled={!validAddress || invalidConnectionOptions}
            on:click={attemptConnect}
            requesting={connectStatus === 'connecting'}
            text={$translate(`app.buttons.${connectStatus === 'idle' ? 'connect' : 'try_again'}`)}
          />
        </div>
      </div>
    </section>
  </Slide>
{/if}

{#if step === 'token'}
  <Slide
    back={() => {
      step = 'connect'
    }}
  >
    <section class="w-full p-6 max-w-lg m-auto">
      <div class="h-8" />

      <h1 class="text-4xl font-bold mb-4">{$translate('app.headings.rune')}</h1>
      <p class="text-neutral-600 dark:text-neutral-300">{$translate('app.subheadings.rune')}</p>

      {#if sessionPublicKey}
        <button
          on:click={handleCopy(sessionPublicKey)}
          class="relative flex items-center w-full my-4"
        >
          <span class="font-semibold">{truncateValue(sessionPublicKey)}</span>

          <div class:text-utility-success={copySuccess === sessionPublicKey}>
            {#if copySuccess === sessionPublicKey}
              <div in:fade class="w-8">
                {@html check}
              </div>
            {:else}
              <div in:fade class="w-8">
                {@html copy}
              </div>
            {/if}
          </div>
        </button>
      {/if}

      <div class="w-full">
        <p class="text-neutral-600 dark:text-neutral-300">
          {$translate('app.inputs.add_rune.recipes')}
        </p>
        <div class="flex justify-between">
          {#each recipes as recipe}
            <button
              on:click={handleCopy(recipe, createRuneRecipe(recipe, sessionPublicKey))}
              class="relative flex items-center w-full my-4"
            >
              <span class="font-semibold">{$translate(`app.inputs.add_rune.${recipe}`)}</span>

              <div class:text-utility-success={copySuccess === recipe}>
                {#if copySuccess === recipe}
                  <div in:fade class="w-8">
                    {@html check}
                  </div>
                {:else}
                  <div in:fade class="w-8">
                    {@html copy}
                  </div>
                {/if}
              </div>
            </button>
          {/each}
        </div>
      </div>

      <div
        class="flex items-center w-full justify-between mb-6 font-thin text-sm dark:text-purple-200 text-purple-700"
      >
        <div class="flex items-center">
          <div class="w-5 mr-2 border-2 rounded-full border-current">
            {@html info}
          </div>
          <a href={DOCS_RUNE_LINK} target="_blank" class="hover:underline" rel="noopener noreferrer"
            >{$translate('app.hints.help')}</a
          >
        </div>

        {#if decodedRune}
          <div in:fade>
            <Button text="Decode Rune" on:click={() => (showDecodedRuneModal = true)} small />
          </div>
        {/if}
      </div>

      <div class="w-full">
        <div class="relative w-full">
          <TextInput
            name="token"
            type="textarea"
            rows={3}
            label={$translate('app.inputs.add_rune.label')}
            placeholder={$translate('app.inputs.add_rune.placeholder')}
            bind:value={token}
            bind:focus={focusRuneInput}
            bind:blur={blurRuneInput}
          />
        </div>
      </div>

      <div class="w-full mt-6">
        <Button
          bind:this={saveRuneButton}
          on:click={saveRune}
          text={$translate('app.buttons.save')}
        >
          <div slot="iconRight" class="w-6 -rotate-90">
            {@html arrow}
          </div>
        </Button>
      </div>
    </section>
  </Slide>
{/if}

{#if showDecodedRuneModal && decodedRune}
  <Modal on:close={() => (showDecodedRuneModal = false)}>
    <div in:fade class="w-[25rem] max-w-full">
      <h4 class="font-semibold mb-2 w-full text-2xl">{$translate('app.labels.rune_summary')}</h4>

      <SummaryRow>
        <span slot="label">{$translate('app.labels.id')}</span>
        <span slot="value">{decodedRune.id}</span>
      </SummaryRow>

      <SummaryRow>
        <span slot="label">{$translate('app.labels.hash')}</span>
        <span slot="value">{truncateValue(decodedRune.hash)}</span>
      </SummaryRow>

      <SummaryRow baseline>
        <span slot="label">{$translate('app.labels.restrictions')}</span>
        <p slot="value">
          {#if decodedRune.restrictions.length === 0}
            <div class="flex items-center">
              <div class="w-4 mr-2 text-utility-pending">
                {@html warning}
              </div>
              <span class="text-utility-pending">{$translate('app.hints.unrestricted')}</span>
            </div>
          {:else}
            {#await formattedRestrictions then formatted}
              {@html formatted.join('<span class="text-xs mr-2"><i><br>AND<br></i></span>')}
            {/await}
          {/if}
        </p>
      </SummaryRow>
    </div>
  </Modal>
{/if}
