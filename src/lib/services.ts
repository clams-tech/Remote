import type { Notification } from './@types/common.js'
import { Subject } from 'rxjs'

export const notifications$ = new Subject<Notification>()

export const clipboard = {
  permission: async (name: PermissionName): Promise<boolean> => {
    try {
      const { state } = await navigator.permissions.query({ name })

      return state === 'granted'
    } catch (error) {
      return false
    }
  },
  read: async (): Promise<string> => {
    const clipboardText = await navigator.clipboard.readText()
    return clipboardText
  },
  write: async (text: string): Promise<void> => {
    await navigator.clipboard.writeText(text)
  },
  writeImage: async (image: Blob | Promise<Blob>): Promise<void> => {
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': image
      })
    ])
  }
}

export const notification = {
  supported: (): boolean => {
    return true
  },
  permission: () => {
    return true
  },
  requestPermission: () => {
    return true
  },
  create: (notification: Notification) => {
    notifications$.next(notification)
  }
}

export const file = {
  save: async (blob: Blob, fileName: string) => {
    const fileUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

export const storage = {
  get: (storageKey: string): string | null => {
    return window.localStorage.getItem(storageKey)
  },
  write: (storageKey: string, data: string): void => {
    window.localStorage.setItem(storageKey, data)
  }
}

export const nfc = {
  available: () => !!window.NDEFReader,
  read: (): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new NDEFReader()
      reader
        .scan()
        .then(() => {
          reader.onreading = event => {
            const decoder = new TextDecoder()
            const decoded = event.message.records.map(record => decoder.decode(record.data))
            resolve(decoded)
          }

          reader.onreadingerror = reject
        })
        .catch(reject)
    })
  }
}

export const log = {
  info: (msg: string) => {
    console.log(msg)
  },
  warn: (msg: string) => {
    console.warn(msg)
  },
  error: (msg: string) => {
    console.error(msg)
  }
}
