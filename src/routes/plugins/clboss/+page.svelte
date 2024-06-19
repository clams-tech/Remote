<script lang="ts">
  import type { PageData } from './$types'

  export let data: PageData

  const { walletId } = data

  console.log(`walletId = `, walletId)
</script>

<p>This is CLBOSS UI</p>
