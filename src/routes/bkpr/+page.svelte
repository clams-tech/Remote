<script>
  import BackButton from '$lib/elements/BackButton.svelte'
  import AccountingExports from '$lib/components/AccountingExports.svelte'
  import { translate } from '$lib/i18n/translations'
  import { goto } from '$app/navigation'
</script>

<svelte:head>
  <title>{$translate('app.titles.bkpr')}</title>
</svelte:head>

<BackButton on:click={() => goto('/')} />
<AccountingExports />
