import type { Session } from './@types/session.js'

const STORAGE_VERSION = 1

export const storageKeys = {
  session: `clams:session:${STORAGE_VERSION}`,
  settings: `clams:settings:${STORAGE_VERSION}`
}

export const getDataFromStorage = (storageKey: string): string | null => {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(storageKey)
  } catch (error) {
    return null
  }
}

export const getSession = (): Session | null => {
  const result = getDataFromStorage(storageKeys.session)
  return result && JSON.parse(result)
}
