<script lang="ts">
  import { translate } from '$lib/i18n/translations.js'
  import refresh from '$lib/icons/refresh.js'

  export let sync: () => Promise<void>

  let syncing = false

  const syncData = async () => {
    syncing = true

    try {
      await sync()
    } catch (error) {
      console.error('Error syncing route data:', error)
    }

    syncing = false
  }
</script>

<button
  disabled={syncing}
  on:click|stopPropagation={syncData}
  class="flex flex-col items-center justify-center"
>
  <div class="w-8" class:animate-spin={syncing}>{@html refresh}</div>
  <div class="text-xs font-semibold">{$translate('app.labels.sync')}</div>
</button>
