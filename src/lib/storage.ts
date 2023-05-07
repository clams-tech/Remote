import AES from 'crypto-js/aes'
import encUtf8 from 'crypto-js/enc-utf8'
import type { Auth } from './@types/auth.js'
import type { Settings } from './@types/settings.js'
import { logger } from './utils.js'

export const SETTINGS_STORAGE_KEY = 'clams-app:settings'
export const AUTH_STORAGE_KEY = 'clams-app:auth'
export const LISTEN_INVOICE_STORAGE_KEY = 'clams-app:listening'

const encryptWithAES = (text: string, passphrase: string) => {
  return AES.encrypt(text, passphrase).toString()
}

const decryptWithAES = (ciphertext: string, passphrase: string) => {
  const bytes = AES.decrypt(ciphertext, passphrase)
  const originalText = bytes.toString(encUtf8)
  return originalText
}

function getDataFromStorage(storageKey: string): string | null {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(storageKey)
  } catch (error) {
    logger.error('Could no get data from storage, access to local storage is blocked')
    return null
  }
}

function writeDataToStorage(storageKey: string, data: unknown) {
  try {
    if (typeof window === 'undefined') return
    return window.localStorage.setItem(storageKey, JSON.stringify(data))
  } catch (error) {
    logger.error('Could no write data to storage, access to local storage is blocked')
  }
}

export function getAuth(passphrase: string): Auth | null {
  const json = getDataFromStorage(AUTH_STORAGE_KEY)

  if (!json) return null

  try {
    const parsed = JSON.parse(json)
    return parsed as Auth
  } catch (error) {
    // encrypted, so try and decrypt
    try {
      const decrypted = decryptWithAES(json, passphrase)
      return JSON.parse(decrypted) as Auth
    } catch (error) {
      logger.error('Error trying to decrypt and parse auth')
      return null
    }
  }
}

export function storeAuth(auth: Auth, passphrase?: string) {
  const authJson = JSON.stringify(auth)
  let authString

  if (passphrase) {
    authString = encryptWithAES(authJson, passphrase)
  } else {
    authString = authJson
  }

  writeDataToStorage(AUTH_STORAGE_KEY, authString)
}

export function getSettings(): Settings {
  const json = getDataFromStorage(SETTINGS_STORAGE_KEY)
  const settings = JSON.parse(json as string)
  return settings
}

export function storePayIndex(data: string) {
  writeDataToStorage(LISTEN_INVOICE_STORAGE_KEY, data)
}
