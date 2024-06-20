<script lang="ts">
  import type { ClbossStatus } from '$lib/@types/plugins'
  import { connections$ } from '$lib/streams'
  import type { Connection } from '$lib/wallets/interfaces'
  import type { PageData } from './$types'

  export let data: PageData
  let clbossStatus: ClbossStatus | null = null

  const { wallet } = data

  $: connection = connections$.value.find(({ walletId }) => walletId === wallet) as Connection

  $: connection?.clboss?.get().then(response => {
    clbossStatus = response
  })

  $: console.log(`clboss status = `, clbossStatus)

  // TODO
  // check if we can reset CLN
  // list all of the options they can change for clboss
  // decipher between changes that can be made that require a CLN restart and those that don't
</script>

<p>This is CLBOSS UI</p>
