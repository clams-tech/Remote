<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { fade } from 'svelte/transition'
  import { decode, type DecodedRune } from 'rune-decoder'
  import LnMessage from 'lnmessage'
  import { goto } from '$app/navigation'
  import { translate } from '$lib/i18n/translations'
  import TextInput from '$lib/elements/TextInput.svelte'
  import Button from '$lib/elements/Button.svelte'
  import { connection$, settings$, updateAuth } from '$lib/streams'
  import Check from '$lib/icons/Check.svelte'
  import Close from '$lib/icons/Close.svelte'
  import Arrow from '$lib/icons/Arrow.svelte'
  import Slide from '$lib/elements/Slide.svelte'
  import SummaryRow from '$lib/elements/SummaryRow.svelte'
  import Warning from '$lib/icons/Warning.svelte'
  import Copy from '$lib/icons/Copy.svelte'
  import Info from '$lib/icons/Info.svelte'
  import { initialiseData } from '$lib/data'
  import { DOCS_CONNECT_LINK, DOCS_RUNE_LINK, WS_PROXY } from '$lib/constants'

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
  let copySuccess = false
  let copyAnimationTimeout: NodeJS.Timeout

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
  }

  async function attemptConnect() {
    connectStatus = 'connecting'

    try {
      const { publicKey, ip, port } = parseNodeAddress(address)

      // create connection to node
      const ln = new LnMessage({
        remoteNodePublicKey: publicKey,
        wsProxy: WS_PROXY,
        ip,
        port: port || 9735
      })

      const connected = await ln.connect()

      connectStatus = connected ? 'success' : 'fail'

      if (connectStatus === 'success') {
        sessionPublicKey = ln.publicKey
        sessionPrivateKey = ln.privateKey
        connection$.next(ln)
      }
    } catch (error) {
      connectStatus = 'fail'
    }
  }

  function saveRune() {
    updateAuth({ token, address, sessionSecret: sessionPrivateKey })
    initialiseData()
    goto('/')
  }

  async function copyPublicKey() {
    copySuccess = await writeClipboardValue(sessionPublicKey)

    if (copySuccess) {
      copyAnimationTimeout = setTimeout(() => (copySuccess = false), 3000)
    }
  }

  onDestroy(() => {
    copyAnimationTimeout && clearTimeout(copyAnimationTimeout)
  })

  function addRune() {
    step = 'token'
    setTimeout(() => {
      focusRuneInput()
    }, 500)
  }

  let connectButton: Button
  let addRuneButton: Button
  let saveRuneButton: Button

  function handleKeyPress(ev: KeyboardEvent) {
    if (ev.key === 'Enter') {
      if (step === 'connect' && connectStatus !== 'connecting') {
        validAddress && connectStatus === 'success' ? addRuneButton.click() : connectButton.click()
        return
      }

      if (step === 'token') {
        decodedRune && saveRuneButton.click()
        return
      }
    }
  }
</script>

<svelte:head>
  <title>{$translate('app.titles.connect')}</title>
</svelte:head>

<svelte:window on:keydown={handleKeyPress} />

{#if step === 'connect'}
  <Slide>
    <section class="flex flex-col justify-center items-start w-full p-6 max-w-xl">
      <div class="mb-6">
        <h1 class="text-4xl font-bold mb-4">{$translate('app.headings.connect')}</h1>
        <p class="text-neutral-600 dark:text-neutral-300">
          {$translate('app.subheadings.connect')}
        </p>
      </div>

      <div class="flex items-center mb-6 font-thin text-sm dark:text-purple-200 text-purple-700">
        <div class="w-5 mr-2 border-2 rounded-full border-current">
          <Info />
        </div>
        <a
          href={DOCS_CONNECT_LINK}
          target="_blank"
          class="hover:underline"
          rel="noopener noreferrer">{$translate('app.hints.how')}</a
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
          />

          <div in:fade class="flex items-center text-sm absolute bottom-1 right-1">
            {#if connectStatus === 'success'}
              <div class="flex items-center">
                <span class="text-utility-success">{$translate('app.inputs.add_rune.success')}</span
                >
                <div class="w-6 text-utility-success">
                  <Check />
                </div>
              </div>
            {:else if connectStatus === 'fail'}
              <div class="flex items-center">
                <span class="text-utility-error">{$translate('app.errors.node_connect')}</span>
                <div class="w-6 text-utility-error">
                  <Close />
                </div>
              </div>
            {/if}
          </div>
        </div>

        <div class="w-full mt-6">
          {#if connectStatus === 'success'}
            <Button
              on:click={addRune}
              text={$translate('app.buttons.add_rune')}
              bind:this={addRuneButton}
            >
              <div slot="iconRight" class="w-6">
                <Arrow direction="right" />
              </div>
            </Button>
          {:else}
            <Button
              bind:this={connectButton}
              disabled={!validAddress}
              on:click={attemptConnect}
              requesting={connectStatus === 'connecting'}
              text={$translate(`app.buttons.${connectStatus === 'idle' ? 'connect' : 'try_again'}`)}
            />
          {/if}
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
    <section class="flex flex-col justify-center items-start w-full h-full p-6 max-w-xl">
      <div class="h-8" />
      <div class="mb-6">
        <h1 class="text-4xl font-bold mb-4">{$translate('app.headings.rune')}</h1>
        <p class="text-neutral-600 dark:text-neutral-300">{$translate('app.subheadings.rune')}</p>
      </div>

      <div class="flex items-center mb-6 font-thin text-sm dark:text-purple-200 text-purple-700">
        <div class="w-5 mr-2 border-2 rounded-full border-current">
          <Info />
        </div>
        <a href={DOCS_RUNE_LINK} target="_blank" class="hover:underline" rel="noopener noreferrer"
          >{$translate('app.hints.how')}</a
        >
      </div>

      {#if sessionPublicKey}
        <div on:click={copyPublicKey} class="relative w-full mb-4">
          <div class="w-full cursor-pointer">
            <TextInput
              name="session"
              type="textarea"
              readonly
              label={'Session Public Key'}
              hint="restrict rune to this key"
              cursorPointer={true}
              value={truncateValue(sessionPublicKey)}
            />
          </div>

          <div class="absolute bottom-3 right-2" class:text-utility-success={copySuccess}>
            {#if copySuccess}
              <div in:fade class="w-8">
                <Check />
              </div>
            {:else}
              <div in:fade class="w-8">
                <Copy />
              </div>
            {/if}
          </div>
        </div>
      {/if}

      <div class="w-full overflow-y-auto p-1">
        <div class="relative w-full">
          <TextInput
            name="token"
            type="textarea"
            label={$translate('app.inputs.add_rune.label')}
            placeholder={$translate('app.inputs.add_rune.placeholder')}
            bind:value={token}
            bind:focus={focusRuneInput}
          />
        </div>

        {#if decodedRune}
          <div in:fade class="w-full mt-6">
            <h4 class="font-semibold mb-2">{$translate('app.labels.summary')}</h4>

            <SummaryRow>
              <span slot="label">{$translate('app.labels.id')}</span>
              <span slot="value">{decodedRune.id}</span>
            </SummaryRow>

            <SummaryRow>
              <span slot="label">{$translate('app.labels.hash')}</span>
              <span slot="value">{truncateValue(decodedRune.hash)}</span>
            </SummaryRow>

            <SummaryRow>
              <span slot="label">{$translate('app.labels.restrictions')}</span>
              <p slot="value">
                {#if decodedRune.restrictions.length === 0}
                  <div class="flex items-center">
                    <div class="w-4 mr-2 text-utility-pending">
                      <Warning />
                    </div>
                    <span class="text-utility-pending">{$translate('app.hints.unrestricted')}</span>
                  </div>
                {:else}
                  {@html decodedRune.restrictions
                    .map(({ summary }) => {
                      const alternatives = summary.split(' OR ')

                      return alternatives
                        .map((alternative) => {
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
                              formatDate({
                                date: new Date(timeMs).toISOString(),
                                language: $settings$.language
                              })
                            ]
                          }

                          const wordsBold = words.map((w, i) =>
                            i === 0 || i === words.length - 1 ? `<b>${w}</b>` : w
                          )

                          return wordsBold.join(' ')
                        })
                        .join('<i><br>OR<br></i>')
                    })
                    .join('<i><br>AND<br></i>')}
                {/if}
              </p>
            </SummaryRow>
          </div>
        {/if}
      </div>

      <div class="mt-6 w-full">
        <Button
          bind:this={saveRuneButton}
          on:click={saveRune}
          text={$translate('app.buttons.save')}
          disabled={!decodedRune}
        >
          <div slot="iconRight" class="w-6">
            <Arrow direction="right" />
          </div>
        </Button>
      </div>
    </section>
  </Slide>
{/if}
