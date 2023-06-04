import { filter } from 'rxjs'
import { STORAGE_KEYS, writeDataToStorage } from './storage.js'
import { settings$ } from './streams.js'
import { logger } from './utils.js'

export function registerSideEffects() {
  // update settings in storage
  settings$.pipe(filter((x) => !!x)).subscribe((update) => {
    try {
      document.documentElement.classList[update.darkmode ? 'add' : 'remove']('dark')
      writeDataToStorage(STORAGE_KEYS.settings, JSON.stringify(update))
    } catch (error) {
      logger.error('Could not save settings to storage, access to local storage denied')
    }
  })
}
