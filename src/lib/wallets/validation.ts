import type { Wallet } from '$lib/@types/wallets.js'
import { validateCoreLnConfiguration } from './coreln/validation.js'

export const validateWalletConfiguration = (wallet: Wallet) => {
  switch (wallet.type) {
    case 'coreln':
      validateCoreLnConfiguration(wallet.configuration!, wallet.id)
      break
    default:
      console.warn('Unknown wallet for validation:', wallet)
  }
}
