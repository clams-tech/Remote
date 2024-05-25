import type { CoreLnConfiguration, Wallet, WalletConfiguration } from '$lib/@types/wallets.js'
import { createRandomHex, encryptWithAES } from '$lib/crypto.js'
import { db, deleteAll } from '$lib/db/index.js'
import { larpMode$, wallets$ } from '$lib/streams.js'
import { nowSeconds } from '$lib/utils.js'

export const autoConnectWallet = async (options: {
  configuration: WalletConfiguration
  label: string
  type: Wallet['type']
  secret: string
}) => {
  const { configuration, label, type, secret } = options
  const { token } = configuration as CoreLnConfiguration
  const walletId = createRandomHex()

  const walletAlreadyExists = wallets$.value.find(
    wallet =>
      (wallet.configuration as CoreLnConfiguration)?.address ===
      (configuration as CoreLnConfiguration).address
  )

  if (walletAlreadyExists) {
    return { wallet: walletAlreadyExists, existed: true }
  } else {
    const wallet = {
      id: walletId,
      label,
      type,
      createdAt: nowSeconds(),
      modifiedAt: nowSeconds(),
      configuration:
        token && configuration
          ? { ...configuration, token: encryptWithAES(token, secret) }
          : configuration,
      lastSync: null,
      syncing: false
    }

    // Only one wallet can be connected in larp mode
    if (larpMode$.value && wallets$.value.length) {
      await deleteAll()
      await db.open()
    }
    await db.wallets.add(wallet)

    return { wallet, existed: false }
  }
}
