import type { Auth } from '$lib/@types/auth.js'
import { getSettings } from '$lib/storage.js'
import { logger } from '$lib/utils'
import CoreLn from './core-lightning'

export function initLn(options: { backend: string; auth: Auth }) {
  const { backend, auth } = options
  const settings = getSettings()

  switch (backend) {
    case 'core_lightning':
      return new CoreLn(auth, settings, logger)
    default:
      throw new Error(`${backend} is not a valid backend`)
  }
}
