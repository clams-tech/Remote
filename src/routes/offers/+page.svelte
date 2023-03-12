<script lang="ts">
  import { goto } from '$app/navigation'
  import BackButton from '$lib/elements/BackButton.svelte'
  import Button from '$lib/elements/Button.svelte'
  import Slide from '$lib/elements/Slide.svelte'
  import Spinner from '$lib/elements/Spinner.svelte'
  import { translate } from '$lib/i18n/translations'
  import lightningOutline from '$lib/icons/lightning-outline'
  import plus from '$lib/icons/plus'
  import trendingDown from '$lib/icons/trending-down'
  import trendingUp from '$lib/icons/trending-up'
  import warning from '$lib/icons/warning'
  import { lastPath$, offers$, offersPayments$ } from '$lib/streams'
  import check from '$lib/icons/check'
  import cross from '$lib/icons/cross'
  import caret from '$lib/icons/caret'
  import CopyValue from '$lib/elements/CopyValue.svelte'
</script>

<svelte:head>
  <title>
    {$translate('app.titles./offers')}
  </title>
</svelte:head>

{#if $offers$.loading}
  <Spinner />
{:else if $offers$.error}
  <BackButton on:click={() => goto('/')} text={$translate('app.titles./')} />
  <section class="w-full p-4 max-w-lg flex items-center justify-center">
    <div class="flex items-center mb-6 mt-12">
      <div class="w-10 mr-2">{@html lightningOutline}</div>
      <h1 class="text-4xl font-bold">
        {$translate('app.titles./offers')}
      </h1>
    </div>
    <div class="flex text-utility-error">
      <div class="w-4 mr-2">{@html warning}</div>
      <p>
        {$translate('app.errors.offers_load_error')}
      </p>
    </div>
  </section>
{:else if $offers$.data}
  <Slide
    back={() => goto('/')}
    backText={$translate('app.titles./')}
    direction={!$lastPath$ || $lastPath$ === '/' ? 'left' : 'right'}
  >
    <section class="flex flex-col justify-center items-start w-full p-4 max-w-lg">
      <div class="flex items-center justify-between mb-6 mt-12 w-full">
        <div class="flex items-center">
          <div class="w-10 mr-2">{@html lightningOutline}</div>
          <h1 class="text-4xl font-bold">
            {$translate('app.titles./offers')}
          </h1>
        </div>

        <div>
          <Button
            on:click={() => goto('/offers/bolt12')}
            text={$translate('app.buttons.create_offer')}
            primary
          >
            <div slot="iconLeft" class="w-8 mb-[1px]">
              {@html plus}
            </div>
          </Button>
        </div>
      </div>

      {#if !$offers$.data.length}
        <!-- @TODO - Render a message indicating that user needs to create some offers -->
      {:else}
        <div class="grid gap-4 w-full max-h-full overflow-auto">
          {#each $offers$.data as { label, id, type, active, single_use, used, bolt12 } (id)}
            <button
              on:click={() => goto(`/offers/${id}`)}
              class="w-full border border-current rounded-md p-4 cursor-pointer flex flex-col shadow-sm dark:shadow-white/75 relative dark:hover:bg-neutral-800/40 hover:bg-neutral-50/50 transition-all"
            >
              <h2 class="text-2xl font-bold mb-1">{label || `Offer ${id.slice(0, 8)}`}</h2>

              <CopyValue value={bolt12} truncateLength={12} />

              <div class="flex flex-wrap w-5/6 gap-2 text-sm mt-6 font-semibold">
                <div class="flex items-center rounded-full border pl-3 pr-2 py-1">
                  <div class="text-sm mr-1">{$translate(`app.labels.${type}`)}</div>
                  <div
                    class="w-4"
                    class:text-utility-success={type === 'pay'}
                    class:text-purple-300={type === 'withdraw'}
                  >
                    {@html type === 'pay' ? trendingUp : trendingDown}
                  </div>
                </div>

                <div class="flex items-center rounded-full border pl-3 pr-1 py-1">
                  <div class="text-sm mr-1">{$translate(`app.labels.active`)}</div>
                  <div
                    class="w-4"
                    class:text-utility-success={active}
                    class:text-utility-error={!active}
                  >
                    {@html active ? check : cross}
                  </div>
                </div>

                <div class="flex items-center rounded-full border pl-3 pr-1 py-1">
                  <div class="text-sm mr-1">
                    {$translate(`app.labels.${single_use ? 'single_use' : 'reusable'}`)}
                  </div>
                  <div class="w-4 text-utility-success">
                    {@html check}
                  </div>
                </div>

                <div class="flex items-center rounded-full border pl-3 pr-1 py-1">
                  {$translate(`app.labels.${used ? 'payments' : 'used'}`)}
                  <div class="text-sm ml-1">
                    {#if used && $offersPayments$[id]}
                      <div
                        class="px-1 text-xs rounded-full border flex items-center justify-center text-utility-success border-utility-success mr-[2px]"
                      >
                        {$offersPayments$[id].length}
                      </div>
                    {:else}
                      <div class="w-4 text-utility-error">
                        {@html cross}
                      </div>
                    {/if}
                  </div>
                </div>
              </div>

              <div class="absolute bottom-4 right-1 w-8 -rotate-90">
                {@html caret}
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </section>
  </Slide>
{/if}
