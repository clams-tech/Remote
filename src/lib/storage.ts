import type { Session } from './@types/session.js'

const STORAGE_VERSION = 1

export const STORAGE_KEYS = {
  session: `clams:session:${STORAGE_VERSION}`,
  settings: `clams:settings:${STORAGE_VERSION}`,
  getStartedHint: `clams:get_started_hint:${STORAGE_VERSION}`
}

export const getDataFromStorage = (storageKey: string): string | null => {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(storageKey)
  } catch (error) {
    return null
  }
}

export const writeDataToStorage = (storageKey: string, data: string): boolean => {
  try {
    if (typeof window === 'undefined') return false
    window.localStorage.setItem(storageKey, data)
    return true
  } catch (error) {
    return false
  }
}

export const getSession = (): Session | null => {
  const result = getDataFromStorage(STORAGE_KEYS.session)
  return result && JSON.parse(result)
}
