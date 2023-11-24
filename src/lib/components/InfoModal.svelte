<script lang="ts">
  import { translate } from '$lib/i18n/translations.js'
  import type { Connection } from '$lib/wallets/interfaces.js'
  import Modal from './Modal.svelte'
  import Qr from './Qr.svelte'

  export let connection: Connection
  const { id, alias, version, host, port } = connection.info
</script>

<Modal on:close>
  {#if alias}
    <div class="w-full flex items-baseline mb-4">
      <h4 class="font-semibold text-3xl">
        {alias}
      </h4>

      {#if version}
        <div class="ml-2">{version}</div>
      {/if}
    </div>
  {/if}

  <Qr
    values={[
      ...(host
        ? [{ label: $translate('app.labels.connect'), value: `${id}@${host}:${port}` }]
        : []),
      { label: $translate('app.labels.pubkey'), value: id }
    ]}
  />
</Modal>
