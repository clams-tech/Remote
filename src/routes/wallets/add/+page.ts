import type { PageLoad } from './$types'
import { goto } from '$app/navigation'
import { db } from '$lib/db/index.js'
import { nowSeconds } from '$lib/utils.js'
import { createRandomHex } from '$lib/crypto.js'
import { walletTypeToInitialConfiguration } from '$lib/wallets'

export const load: PageLoad = async () => {
  // add new CLN wallet to the db with generic label and random id
  const id = createRandomHex()
  const type = 'coreln'
  const label = type

  await db.wallets.add({
    id,
    label,
    type,
    createdAt: nowSeconds(),
    modifiedAt: null,
    configuration: walletTypeToInitialConfiguration(type),
    lastSync: null,
    syncing: false
  })

  // route to the created wallet id
  await goto(`/wallets/${id}`)
}
